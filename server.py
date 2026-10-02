#!/usr/bin/env python3
"""
ReelForge Backend
-----------------
Local server that:
1. Accepts a YouTube playlist URL
2. Downloads every video with yt-dlp
3. Splits each video into sequential 30-second vertical clips with ffmpeg
4. Zips all reels and serves a download link

Requirements:
  pip install flask flask-cors yt-dlp
  System: ffmpeg must be in PATH

Run:
  python server.py
  Then open the frontend and paste a playlist.
"""

import os
import sys
import json
import time
import uuid
import shutil
import zipfile
import subprocess
import threading
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE = Path(__file__).parent.resolve()
WORK = BASE / "work"
OUTPUT = BASE / "output"
WORK.mkdir(exist_ok=True)
OUTPUT.mkdir(exist_ok=True)

# In-memory job store (simple demo – use Redis in production)
jobs = {}


def run_cmd(cmd, cwd=None):
    print(">", " ".join(cmd))
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print("STDERR:", result.stderr[-2000:] if result.stderr else "")
        raise RuntimeError(f"Command failed: {cmd[0]}")
    return result


def get_playlist_entries(url: str):
    """Return list of video entries with id, title, duration."""
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--print", "%(id)s|||%(title)s|||%(duration)s",
        "--no-warnings",
        url,
    ]
    result = run_cmd(cmd)
    entries = []
    for line in result.stdout.strip().splitlines():
        if "|||" not in line:
            continue
        parts = line.split("|||")
        if len(parts) >= 3:
            vid, title, dur = parts[0], parts[1], parts[2]
            try:
                duration = float(dur) if dur and dur != "NA" else 0
            except ValueError:
                duration = 0
            entries.append({"id": vid, "title": title, "duration": duration})
    return entries


def download_video(video_id: str, out_dir: Path):
    """Download best mp4 (or merge) for a single video."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    out_template = str(out_dir / f"{video_id}.%(ext)s")
    cmd = [
        "yt-dlp",
        "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "-o", out_template,
        "--no-playlist",
        "--no-warnings",
        url,
    ]
    run_cmd(cmd)
    # Find the file
    for f in out_dir.glob(f"{video_id}.*"):
        if f.suffix.lower() in {".mp4", ".mkv", ".webm"}:
            return f
    raise FileNotFoundError(f"Downloaded file for {video_id} not found")


def split_into_30s_reels(video_path: Path, reels_dir: Path, prefix: str):
    """
    Split a video into sequential 30-second vertical clips.
    Uses ffmpeg scale + crop to 9:16 (1080x1920) when possible.
    """
    reels_dir.mkdir(parents=True, exist_ok=True)

    # Get duration
    probe = run_cmd([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ])
    duration = float(probe.stdout.strip())
    num_clips = max(1, int(duration // 30) + (1 if duration % 30 > 2 else 0))

    created = []
    for i in range(num_clips):
        start = i * 30
        out_name = reels_dir / f"{prefix}_reel_{i+1:03d}.mp4"
        # Vertical 9:16 crop + scale, 30s (or remaining)
        # scale to height 1920 then crop width 1080 centered
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start),
            "-t", "30",
            "-i", str(video_path),
            "-vf", "scale=-2:1920,crop=1080:1920",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(out_name),
        ]
        try:
            run_cmd(cmd)
            if out_name.exists() and out_name.stat().st_size > 1000:
                created.append(out_name)
        except Exception as e:
            print(f"Clip {i} failed: {e}")
            # Fallback: no crop, just cut
            cmd2 = [
                "ffmpeg", "-y",
                "-ss", str(start),
                "-t", "30",
                "-i", str(video_path),
                "-c", "copy",
                str(out_name),
            ]
            try:
                run_cmd(cmd2)
                if out_name.exists():
                    created.append(out_name)
            except Exception:
                pass
    return created


def process_job(job_id: str, playlist_url: str):
    job = jobs[job_id]
    job_dir = WORK / job_id
    job_dir.mkdir(exist_ok=True)
    reels_dir = job_dir / "reels"
    reels_dir.mkdir(exist_ok=True)

    try:
        job["status"] = "Fetching playlist info..."
        job["progress"] = 5
        entries = get_playlist_entries(playlist_url)
        if not entries:
            raise RuntimeError("No videos found in playlist (is it public?)")

        total_videos = len(entries)
        all_reels = []
        job["status"] = f"Found {total_videos} videos. Starting downloads..."

        for idx, entry in enumerate(entries):
            progress_base = 10 + int((idx / total_videos) * 70)
            job["progress"] = progress_base
            job["status"] = f"Downloading ({idx+1}/{total_videos}): {entry['title'][:60]}"
            job["elapsed"] = int(time.time() - job["start"])

            try:
                video_file = download_video(entry["id"], job_dir)
                job["status"] = f"Slicing into 30s reels: {entry['title'][:50]}"
                reels = split_into_30s_reels(video_file, reels_dir, entry["id"])
                all_reels.extend(reels)
                # Clean up source video to save space
                video_file.unlink(missing_ok=True)
            except Exception as e:
                print(f"Failed on {entry['id']}: {e}")
                job["status"] = f"Skipped one video due to error, continuing..."
                continue

        job["progress"] = 85
        job["status"] = f"Creating ZIP with {len(all_reels)} reels..."
        job["reels"] = len(all_reels)

        zip_path = OUTPUT / f"reelforge_{job_id}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for reel in all_reels:
                zf.write(reel, arcname=reel.name)

        job["progress"] = 100
        job["status"] = "Complete!"
        job["done"] = True
        job["download_url"] = f"http://localhost:8765/download/{job_id}"
        job["filename"] = zip_path.name
        job["reels"] = len(all_reels)

        # Cleanup work dir (keep zip)
        shutil.rmtree(job_dir, ignore_errors=True)

    except Exception as e:
        job["status"] = f"Error: {str(e)}"
        job["done"] = True
        job["error"] = str(e)
        print("Job failed:", e)


@app.route("/process", methods=["POST"])
def process():
    data = request.get_json(force=True)
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "id": job_id,
        "url": url,
        "status": "Queued",
        "progress": 0,
        "done": False,
        "start": time.time(),
        "elapsed": 0,
        "reels": 0,
    }

    t = threading.Thread(target=process_job, args=(job_id, url), daemon=True)
    t.start()

    return jsonify({"job_id": job_id})


@app.route("/status/<job_id>")
def status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    job["elapsed"] = int(time.time() - job["start"])
    return jsonify(job)


@app.route("/download/<job_id>")
def download(job_id):
    zip_path = OUTPUT / f"reelforge_{job_id}.zip"
    if not zip_path.exists():
        return jsonify({"error": "File not ready or expired"}), 404
    return send_file(zip_path, as_attachment=True, download_name=f"reelforge-shorts-{job_id}.zip")


@app.route("/")
def index():
    return jsonify({
        "service": "ReelForge Backend",
        "endpoints": {
            "POST /process": "Start a playlist conversion",
            "GET /status/<job_id>": "Check progress",
            "GET /download/<job_id>": "Download the ZIP",
        },
    })


if __name__ == "__main__":
    print("=" * 60)
    print("  ReelForge Backend running on http://localhost:8765")
    print("  Make sure yt-dlp and ffmpeg are installed.")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8765, debug=False, threaded=True)
