// Main application controller
(function () {
  const sections = {
    landing: document.getElementById('landing'),
    tool: document.getElementById('tool'),
    processing: document.getElementById('processing'),
    outro: document.getElementById('outro'),
  };

  const enterBtn = document.getElementById('enter-btn');
  const startBtn = document.getElementById('start-btn');
  const playlistInput = document.getElementById('playlist-url');
  const timerDisplay = document.getElementById('timer-display');
  const statusText = document.getElementById('status-text');
  const progressFill = document.getElementById('progress-fill');
  const reelCount = document.getElementById('reel-count');
  const downloadBtn = document.getElementById('download-btn');
  const restartBtn = document.getElementById('restart-btn');
  const finalReels = document.getElementById('final-reels');
  const bgMusic = document.getElementById('bg-music');

  function showSection(name) {
    Object.values(sections).forEach((s) => s.classList.remove('active'));
    sections[name].classList.add('active');
  }

  // Landing → Tool
  enterBtn.addEventListener('click', () => {
    showSection('tool');
  });

  // Start transformation
  startBtn.addEventListener('click', () => {
    const url = playlistInput.value.trim();
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
      alert('Please enter a valid YouTube playlist URL');
      return;
    }

    showSection('processing');
    startSimulation(url);
  });

  // Simulated (or real if backend is running) processing
  let timerInterval = null;
  let seconds = 0;

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  async function startSimulation(playlistUrl) {
    seconds = 0;
    progressFill.style.width = '0%';
    timerDisplay.textContent = '00:00';
    statusText.textContent = 'Connecting to YouTube...';
    reelCount.textContent = 'Analyzing playlist length...';

    // Try to play romantic music
    try {
      bgMusic.volume = 0.45;
      await bgMusic.play();
    } catch (e) {
      console.log('Autoplay blocked – user interaction already happened, music may still work');
    }

    // Try real backend first (if user started the Python server)
    let usedBackend = false;
    try {
      const res = await fetch('http://localhost:8765/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: playlistUrl }),
      });
      if (res.ok) {
        usedBackend = true;
        const data = await res.json();
        // Backend streams progress via SSE or we poll – simplified here
        await pollBackendProgress(data.job_id);
        return;
      }
    } catch (e) {
      // Backend not running → fall back to beautiful demo simulation
    }

    // DEMO SIMULATION (always works offline)
    const stages = [
      { t: 3, text: 'Fetching playlist metadata...', progress: 8 },
      { t: 7, text: 'Calculating total duration & reel count...', progress: 18 },
      { t: 12, text: 'Downloading video streams (high quality)...', progress: 35 },
      { t: 20, text: 'Converting to vertical 9:16 format...', progress: 55 },
      { t: 28, text: 'Slicing into sequential 30-second reels...', progress: 75 },
      { t: 35, text: 'Encoding & optimizing for Shorts / Reels...', progress: 90 },
      { t: 40, text: 'Packaging everything into a single ZIP...', progress: 100 },
    ];

    // Fake total duration → estimate reels (demo uses random realistic number)
    const estimatedReels = 18 + Math.floor(Math.random() * 45); // 18–62 reels
    reelCount.textContent = `Estimated ${estimatedReels} reels will be generated`;

    timerInterval = setInterval(() => {
      seconds++;
      timerDisplay.textContent = formatTime(seconds);
    }, 1000);

    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      if (stageIdx >= stages.length) {
        clearInterval(stageTimer);
        clearInterval(timerInterval);
        finishDemo(estimatedReels);
        return;
      }
      const stage = stages[stageIdx];
      if (seconds >= stage.t) {
        statusText.textContent = stage.text;
        progressFill.style.width = stage.progress + '%';
        stageIdx++;
      }
    }, 400);
  }

  async function pollBackendProgress(jobId) {
    // Simple polling for real backend
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`http://localhost:8765/status/${jobId}`);
        const data = await r.json();
        progressFill.style.width = data.progress + '%';
        statusText.textContent = data.status;
        reelCount.textContent = data.reels ? `${data.reels} reels ready` : 'Working...';
        timerDisplay.textContent = formatTime(data.elapsed || seconds);

        if (data.done) {
          clearInterval(poll);
          clearInterval(timerInterval);
          finishReal(data);
        }
      } catch (e) {
        clearInterval(poll);
      }
    }, 1500);
  }

  function finishDemo(numReels) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
    finalReels.textContent = `${numReels} cinematic 30-second reels forged successfully`;
    // In pure demo mode we offer a sample placeholder zip explanation
    downloadBtn.href = '#';
    downloadBtn.onclick = (e) => {
      e.preventDefault();
      alert(
        'DEMO MODE\n\n' +
        'This frontend is fully interactive.\n\n' +
        'To generate REAL reels:\n' +
        '1. Install yt-dlp + ffmpeg\n' +
        '2. Run the Python backend (see README)\n' +
        '3. Refresh and paste the same playlist again.\n\n' +
        'The backend will download, split every video into sequential 30s vertical clips, and give you a real ZIP download.'
      );
    };
    showSection('outro');
  }

  function finishReal(data) {
    bgMusic.pause();
    finalReels.textContent = `${data.reels} reels ready for download`;
    downloadBtn.href = data.download_url;
    downloadBtn.download = data.filename || 'reelforge-shorts.zip';
    downloadBtn.onclick = null;
    showSection('outro');
  }

  restartBtn.addEventListener('click', () => {
    playlistInput.value = '';
    showSection('tool');
  });
})();
