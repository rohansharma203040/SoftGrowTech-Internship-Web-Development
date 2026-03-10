// ─────────────────────────────────────────────
//  GROOVE — Music Player  |  script.js
//  Uses Web Audio API to generate real sound
// ─────────────────────────────────────────────

// ── Web Audio Context ──
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx     = new AudioContext();

let masterGain = audioCtx.createGain();
masterGain.gain.value = 0.75;
masterGain.connect(audioCtx.destination);

// Active oscillator nodes (stopped & recreated each time)
let activeNodes = [];

/**
 * Each song has a unique chord (array of frequencies) and a waveform type.
 * This gives every track a distinct sound character.
 */
const songs = [
  { title: "Midnight Drive",     artist: "The Velvet Hours",  genre: "Indie",     dur: 214,
    freqs: [130.81, 164.81, 196.00, 261.63], wave: "sine",     tempo: 0.8 },
  { title: "Worn Leather Boots", artist: "J. Calloway",       genre: "Folk",      dur: 188,
    freqs: [110.00, 146.83, 174.61, 220.00], wave: "triangle", tempo: 0.6 },
  { title: "Neon Spine",         artist: "Parallax Youth",    genre: "Synthwave", dur: 243,
    freqs: [138.59, 174.61, 207.65, 277.18], wave: "sawtooth", tempo: 1.2 },
  { title: "Rust & Honey",       artist: "Clara Vane",        genre: "Soul",      dur: 197,
    freqs: [123.47, 155.56, 185.00, 246.94], wave: "sine",     tempo: 0.7 },
  { title: "Empty Highways",     artist: "The Long Morrow",   genre: "Country",   dur: 222,
    freqs: [116.54, 146.83, 174.61, 233.08], wave: "triangle", tempo: 0.9 },
  { title: "Slow Burn",          artist: "Ossian Black",      genre: "Blues",     dur: 265,
    freqs: [103.83, 130.81, 155.56, 207.65], wave: "sine",     tempo: 0.5 },
  { title: "Glass Morning",      artist: "Sable Dream",       genre: "Ambient",   dur: 178,
    freqs: [174.61, 220.00, 261.63, 349.23], wave: "sine",     tempo: 0.4 },
  { title: "Paper Cranes",       artist: "Yuki Tanaka",       genre: "Jazz",      dur: 231,
    freqs: [146.83, 185.00, 220.00, 293.66], wave: "triangle", tempo: 1.0 },
];

// ── State ──
let currentIdx = -1;
let isPlaying  = false;
let currentSec = 0;
let ticker     = null;

// ── Helpers ──
function formatTime(s) {
  const mins = Math.floor(s / 60);
  const secs = String(Math.floor(s % 60)).padStart(2, '0');
  return `${mins}:${secs}`;
}

// ── Build Playlist ──
const playlistBody = document.getElementById('playlistBody');

songs.forEach((song, i) => {
  const row = document.createElement('div');
  row.className   = 'song-row';
  row.dataset.idx = i;
  row.innerHTML = `
    <div class="song-num" id="num-${i}">${i + 1}</div>
    <div class="song-info">
      <div class="song-name">${song.title}</div>
      <div class="song-artist">${song.artist}</div>
    </div>
    <div class="song-genre">${song.genre}</div>
    <div class="song-dur">${formatTime(song.dur)}</div>
  `;
  row.addEventListener('click', () => loadSong(i, true));
  playlistBody.appendChild(row);
});

document.getElementById('playlistCount').textContent = `${songs.length} tracks`;

// ── Audio Engine ──

/**
 * Stop all currently playing oscillator nodes.
 */
function stopAudio() {
  activeNodes.forEach(node => {
    try {
      node.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
      node.osc.stop(audioCtx.currentTime + 0.2);
      if (node.lfo) node.lfo.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  });
  activeNodes = [];
}

/**
 * Start synthesized audio for the given song.
 * Creates layered oscillators with slow amplitude modulation for a "music" feel.
 * @param {object} song
 */
function startAudio(song) {
  stopAudio();

  if (audioCtx.state === 'suspended') audioCtx.resume();

  song.freqs.forEach((freq, idx) => {
    // Main oscillator
    const osc  = audioCtx.createOscillator();
    osc.type           = song.wave;
    osc.frequency.value = freq;

    // Per-note gain
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;

    // Low-pass filter to soften harsh waveforms
    const filter = audioCtx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value         = 0.8;

    // LFO — slow tremolo for organic feel
    const lfo     = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value  = song.tempo * (0.3 + idx * 0.07);
    lfoGain.gain.value   = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);

    // Chain: osc → filter → gainNode → masterGain → speakers
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);

    // Fade in gently
    gainNode.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.4);

    osc.start();
    lfo.start();

    activeNodes.push({ osc, gain: gainNode, lfo });
  });

  // Subtle bass pulse one octave below root
  const bass     = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  bass.type            = 'sine';
  bass.frequency.value = song.freqs[0] / 2;
  bassGain.gain.value  = 0;
  bass.connect(bassGain);
  bassGain.connect(masterGain);
  bassGain.gain.setTargetAtTime(0.08, audioCtx.currentTime, 0.5);
  bass.start();
  activeNodes.push({ osc: bass, gain: bassGain, lfo: null });
}

// ── Core Functions ──

function loadSong(idx, autoPlay) {
  document.querySelectorAll('.song-row').forEach(r => r.classList.remove('active'));

  if (currentIdx >= 0) {
    document.getElementById(`num-${currentIdx}`).innerHTML = currentIdx + 1;
  }

  currentIdx = idx;
  currentSec = 0;

  const song = songs[idx];
  document.getElementById('trackTitle').textContent  = song.title;
  document.getElementById('trackArtist').textContent = song.artist;
  document.getElementById('timeTotal').textContent   = formatTime(song.dur);

  updateProgress();

  document.querySelector(`.song-row[data-idx="${idx}"]`).classList.add('active');

  if (autoPlay) {
    startPlayback();
  } else {
    pausePlayback();
  }
}

function startPlayback() {
  isPlaying = true;

  if (audioCtx.state === 'suspended') audioCtx.resume();

  startAudio(songs[currentIdx]);

  document.getElementById('iconPlay').style.display  = 'none';
  document.getElementById('iconPause').style.display = 'block';
  document.getElementById('vinyl').classList.add('spinning');

  const dot = document.getElementById('statusDot');
  dot.style.background = 'var(--green)';
  dot.style.boxShadow  = '0 0 6px var(--green)';
  document.getElementById('statusText').textContent = `Playing — ${songs[currentIdx].title}`;

  document.getElementById(`num-${currentIdx}`).innerHTML = `
    <div class="bars">
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
    </div>
  `;

  clearInterval(ticker);
  ticker = setInterval(() => {
    currentSec++;
    if (currentSec >= songs[currentIdx].dur) {
      nextSong();
    } else {
      updateProgress();
    }
  }, 1000);
}

function pausePlayback() {
  isPlaying = false;
  clearInterval(ticker);
  stopAudio();

  document.getElementById('iconPlay').style.display  = 'block';
  document.getElementById('iconPause').style.display = 'none';
  document.getElementById('vinyl').classList.remove('spinning');

  const dot = document.getElementById('statusDot');
  dot.style.background = '#4a3218';
  dot.style.boxShadow  = 'none';

  if (currentIdx >= 0) {
    document.getElementById('statusText').textContent = `Paused — ${songs[currentIdx].title}`;
    document.getElementById(`num-${currentIdx}`).innerHTML = currentIdx + 1;
  }
}

function updateProgress() {
  const totalDur = songs[currentIdx] ? songs[currentIdx].dur : 1;
  const percent  = (currentSec / totalDur) * 100;
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('timeCurrent').textContent  = formatTime(currentSec);
}

function nextSong() {
  const next = (currentIdx + 1) % songs.length;
  loadSong(next, true);
}

function prevSong() {
  if (currentSec > 3) {
    currentSec = 0;
    updateProgress();
    return;
  }
  const prev = (currentIdx - 1 + songs.length) % songs.length;
  loadSong(prev, isPlaying);
}

// ── Button Listeners ──
document.getElementById('btnPlay').addEventListener('click', () => {
  if (currentIdx < 0) { loadSong(0, true); return; }
  isPlaying ? pausePlayback() : startPlayback();
});

document.getElementById('btnNext').addEventListener('click', nextSong);
document.getElementById('btnPrev').addEventListener('click', prevSong);

// ── Seek on Progress Bar Click ──
document.getElementById('progressBar').addEventListener('click', (e) => {
  if (currentIdx < 0) return;
  const rect    = e.currentTarget.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  currentSec    = Math.floor(percent * songs[currentIdx].dur);
  updateProgress();
});

// ── Volume Slider ──
const volSlider = document.getElementById('volSlider');

function updateVolumeFill(val) {
  const v = val / 100;
  masterGain.gain.setTargetAtTime(v, audioCtx.currentTime, 0.05);
  volSlider.style.background =
    `linear-gradient(90deg, var(--amber) ${val}%, var(--card) ${val}%)`;
  document.getElementById('volPct').textContent = val + '%';
}

volSlider.addEventListener('input', (e) => updateVolumeFill(e.target.value));

// Init slider fill
updateVolumeFill(volSlider.value);
