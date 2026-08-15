/**
 * Bihari Orchestra - Retro Bhojpuri Ambient Radio
 * Enhanced Live Listener Counter Engine with SSE & Smooth Number Tweening
 */

// Playlist is no longer hardcoded — it is always loaded dynamically
// from whatever audio files exist in the server's /songs folder.
let playlist = [];

let currentIndex = 0;
let isPlaying = false;
let audioElement = new Audio();

// Live listener counter state
let currentDisplayCount = 1248;
let targetCount = 1248;
let countAnimationTimer = null;

// Web Audio API Context
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ----------------------------------------------------
// Smooth Live Listeners Counter Animation
// ----------------------------------------------------
function getSynchronizedGlobalCount() {
  const nowSec = Math.floor(Date.now() / 1000);
  const interval5s = Math.floor(nowSec / 5);
  const date = new Date();
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const dailyFactor = Math.sin(((utcHours - 10.5) / 24) * 2 * Math.PI);
  const baseCount = 1320 + Math.floor(dailyFactor * 280);
  
  function getNoise(tick) {
    const x = Math.sin(tick * 12.9898 + 78.233) * 43758.5453;
    const rand = x - Math.floor(x);
    return Math.floor((rand - 0.48) * 24);
  }
  return Math.max(980, baseCount + getNoise(interval5s));
}

function animateCountTo(target) {
  targetCount = target;
  if (countAnimationTimer) clearInterval(countAnimationTimer);

  countAnimationTimer = setInterval(() => {
    const diff = targetCount - currentDisplayCount;
    if (Math.abs(diff) <= 1) {
      currentDisplayCount = targetCount;
      clearInterval(countAnimationTimer);
    } else {
      currentDisplayCount += Math.round(diff * 0.25);
    }

    const el = document.getElementById('onlineCount');
    if (el) {
      el.innerText = currentDisplayCount.toLocaleString('en-IN');
    }
  }, 40);
}

function initLiveStatsStream() {
  // Try connecting via SSE (Server-Sent Events) for real server stats
  if (typeof EventSource !== 'undefined') {
    try {
      const evtSource = new EventSource('/api/live-stats');
      evtSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data && data.onlineCount) {
            animateCountTo(data.onlineCount);
          }
        } catch(e) {}
      };
      evtSource.onerror = function() {
        evtSource.close();
        startClientFallbackInterval();
      };
    } catch(err) {
      startClientFallbackInterval();
    }
  } else {
    startClientFallbackInterval();
  }
}

function startClientFallbackInterval() {
  animateCountTo(getSynchronizedGlobalCount());
  setInterval(() => {
    animateCountTo(getSynchronizedGlobalCount());
  }, 3500);
}

// ----------------------------------------------------
// Local Songs Dynamic Fetcher (/api/songs)
// ----------------------------------------------------
async function fetchLocalSongs() {
  try {
    const res = await fetch('/api/songs', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        playlist = data.map(item => ({
          title: item.title,
          artist: item.artist,
          src: item.src,
          cover: 'img/hero-bg.jpg'
        }));
        console.log(`Loaded ${playlist.length} songs from songs/ folder!`);
      } else {
        playlist = [];
        console.log('No songs found in songs/ folder.');
      }
    } else {
      playlist = [];
      console.log('Could not reach /api/songs — no songs loaded.');
    }
  } catch (err) {
    playlist = [];
    console.log('Error fetching songs/ folder:', err);
  }
  loadCurrentTrack(false);
}

// ----------------------------------------------------
// HTML5 Audio Controller
// ----------------------------------------------------
function setupAudioListeners() {
  audioElement.preload = "auto";
  
  audioElement.addEventListener('play', () => {
    isPlaying = true;
    updatePlayIconUI(true);
  });

  audioElement.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayIconUI(false);
  });

  audioElement.addEventListener('timeupdate', () => {
    const cur = audioElement.currentTime || 0;
    const dur = audioElement.duration || 0;
    
    document.getElementById('timeNow').innerText = formatTime(cur);
    if (!isNaN(dur) && dur > 0) {
      document.getElementById('timeTotal').innerText = formatTime(dur);
      const pct = (cur / dur) * 100;
      document.getElementById('progressFill').style.width = `${pct}%`;
      const pBar = document.getElementById('progressBar');
      if (pBar) pBar.setAttribute('aria-valuenow', Math.round(pct));
    }
  });

  audioElement.addEventListener('ended', () => {
    nextTrack();
  });

  audioElement.addEventListener('error', (e) => {
    console.log('Audio file error, trying next:', e);
    setTimeout(nextTrack, 1000);
  });
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function loadCurrentTrack(autoPlay = true) {
  if (playlist.length === 0) {
    const trackEl = document.getElementById('trackName');
    if (trackEl) trackEl.innerText = 'No songs found in songs folder';
    const stationEl = document.getElementById('stationSubtitle');
    if (stationEl) stationEl.innerText = 'Add audio files to the songs/ folder';
    return;
  }
  currentIndex = (currentIndex + playlist.length) % playlist.length;
  const track = playlist[currentIndex];

  const trackEl = document.getElementById('trackName');
  if (trackEl) trackEl.innerText = track.title;

  const stationEl = document.getElementById('stationSubtitle');
  if (stationEl) stationEl.innerText = track.artist;

  const discEl = document.getElementById('coverDisc');
  if (discEl) {
    discEl.style.backgroundImage = `url('${track.cover || 'img/hero-bg.jpg'}')`;
  }

  audioElement.src = track.src;
  document.getElementById('timeNow').innerText = "0:00";
  document.getElementById('progressFill').style.width = "0%";

  if (autoPlay) {
    audioElement.play().then(() => {
      isPlaying = true;
      updatePlayIconUI(true);
    }).catch(err => {
      console.log('Autoplay caught:', err);
    });
  }
}

function togglePlay() {
  if (playlist.length === 0) return;
  getAudioContext();
  if (isPlaying) {
    audioElement.pause();
    isPlaying = false;
  } else {
    if (!audioElement.src || audioElement.src.endsWith('/')) {
      loadCurrentTrack(true);
    } else {
      audioElement.play().then(() => {
        isPlaying = true;
      }).catch(e => {
        console.log('Play err:', e);
      });
    }
  }
  updatePlayIconUI(isPlaying);
}

function nextTrack() {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex + 1) % playlist.length;
  loadCurrentTrack(true);
}

function prevTrack() {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadCurrentTrack(true);
}

function updatePlayIconUI(playing) {
  const icon = document.getElementById('playIcon');
  if (icon) {
    icon.innerHTML = playing
      ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>`
      : `<path d="M8 5v14l11-7-11-7Z"></path>`;
  }
  const btn = document.getElementById('playButton');
  if (btn) btn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  const disc = document.getElementById('coverDisc');
  if (disc) disc.classList.toggle('spinning', playing);
}

// ----------------------------------------------------
// UI Initialization
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupAudioListeners();
  fetchLocalSongs();
  initLiveStatsStream();

  // Player controls
  document.getElementById('coverButton')?.addEventListener('click', togglePlay);
  document.getElementById('playButton')?.addEventListener('click', togglePlay);
  document.getElementById('prevButton')?.addEventListener('click', prevTrack);
  document.getElementById('nextButton')?.addEventListener('click', nextTrack);

  // Progress Bar Seek
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      if (!audioElement.duration) return;
      const rect = progressBar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioElement.currentTime = pct * audioElement.duration;
    });
  }

  // Support Modal
  const supportBtn = document.getElementById('supportBtn');
  const supportModal = document.getElementById('supportModal');
  const supportClose = document.getElementById('supportModalClose');

  function openSupport() {
    supportModal?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSupport() {
    supportModal?.classList.remove('open');
    document.body.style.overflow = '';
  }

  supportBtn?.addEventListener('click', openSupport);
  supportClose?.addEventListener('click', closeSupport);
  supportModal?.addEventListener('click', (e) => {
    if (e.target === supportModal) closeSupport();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSupport();
  });

  // Scene Dropdown
  const sel = document.getElementById('themeSelect');
  if (sel) {
    fetch('themes.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.options && data.options.length) {
          sel.innerHTML = `<option value="" disabled selected hidden>बदलो मंच (Themes)</option>` +
            data.options.map(t => `<option value="${t.id}">${t.emoji} ${t.label}</option>`).join('');
        }
      })
      .catch(() => {
        sel.innerHTML = `<option value="" disabled selected hidden>बदलो मंच (Themes)</option>
          <option value="stage">🎪 स्टेज ऑर्केस्ट्रा</option>
          <option value="chopal">🏮 गाँव की चौपाल</option>
          <option value="cassette">📻 पुरानी कैसेट धुनें</option>
          <option value="bhikhari">🪕 भिखारी ठाकुर मंच</option>`;
      });

    sel.addEventListener('change', () => {
      const theme = sel.value;
      const title = document.getElementById('heroMainTitle');
      if (theme === 'bhikhari' && title) {
        title.innerHTML = 'भिखारी ठाकुर<br>लोकनाट्य';
      } else if (theme === 'chopal' && title) {
        title.innerHTML = 'देहाती चौपाल<br>और ढोलक';
      } else if (theme === 'cassette' && title) {
        title.innerHTML = 'टी-सीरीज़<br>कैसेट 90s';
      } else if (title) {
        title.innerHTML = 'बिहारी<br>ऑर्केस्ट्रा';
      }
    });
  }
});
