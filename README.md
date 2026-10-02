# ReelForge — YouTube Playlist → Cinematic 30s Shorts

A complete, ready-to-run project that turns any public YouTube playlist into sequential 30-second vertical reels (Shorts / Reels format) without changing the original content — just pure sequential cuts that cover every second.

## What you get

### Frontend (fully interactive cinematic experience)
- **3D cinematic landing page** (Three.js torus-knot portal + particles + parallax)
- Clean tool page to paste a playlist URL
- **Processing screen** with romantic piano-style background music, live timer, progress bar, and animated 3D rings
- **Cinematic 3D outro** with download button
- Works offline as a beautiful demo; automatically connects to the local backend when available

### Backend (real conversion)
- Accepts playlist URL
- Downloads every video with `yt-dlp`
- Splits each video into sequential **30-second vertical 9:16 clips** using `ffmpeg`
- Packages everything into one ZIP for download
- Live progress reporting

---

## Quick Start

### 1. Frontend only (demo mode)
Just open `index.html` in a modern browser (Chrome / Edge / Firefox).  
Everything works visually. Download button will explain how to enable real conversion.

### 2. Full real conversion (recommended)

#### Prerequisites
```bash
# Install system tools
# Ubuntu / Debian
sudo apt update && sudo apt install -y ffmpeg

# macOS
brew install ffmpeg yt-dlp

# Windows
# Install ffmpeg from https://ffmpeg.org and add to PATH
# Or use chocolatey: choco install ffmpeg

# Install yt-dlp (any OS)
pip install -U yt-dlp
```

#### Run the backend
```bash
cd backend
pip install -r requirements.txt
python server.py
```
You should see:
```
ReelForge Backend running on http://localhost:8765
```

#### Open the frontend
Open `index.html` in your browser (or serve it with any static server).

Paste a **public** YouTube playlist URL → Start Transformation.  
The frontend will talk to `localhost:8765`, show real progress, and give you a real ZIP download when finished.

---

## How the conversion works

1. Playlist is scanned (flat playlist mode)
2. Each video is downloaded in the best available quality ≤ 1080p
3. Every video is cut into sequential 30-second segments
4. Each segment is scaled & center-cropped to **1080×1920 (9:16)** so it is ready for YouTube Shorts / Instagram Reels / TikTok
5. All resulting files are zipped and offered for download

**Content is never altered** — only cut and reformatted to vertical.

---

## Project structure
```
youtube-to-reels/
├── index.html              # Main SPA
├── css/styles.css
├── js/
│   ├── main.js             # App logic, timer, transitions
│   ├── three-landing.js    # 3D landing scene
│   ├── three-timer.js      # 3D processing rings
│   └── three-outro.js      # 3D success scene
├── backend/
│   ├── server.py           # Flask + yt-dlp + ffmpeg
│   └── requirements.txt
└── README.md
```

---

## Important legal & practical notes

- **YouTube Terms of Service** generally prohibit bulk downloading and redistribution of content. This tool is intended for **personal / educational / archival use** only.
- Large playlists take significant time, disk space, and bandwidth.
- Age-restricted or private videos will be skipped.
- The backend cleans up intermediate files after zipping, but keep an eye on disk usage while processing.

---

## Customization ideas

- Change reel length (currently hard-coded to 30s) in `backend/server.py` → `split_into_30s_reels`
- Add captions / subtitles with Whisper + ffmpeg
- Add AI highlight detection instead of sequential cuts
- Deploy frontend to Netlify / Vercel and backend to a VPS with more storage

---

Made with ❤️ for creators who want full control over their content.
