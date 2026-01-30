const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const inputText = document.getElementById('inputText');
const randomizeBtn = document.getElementById('randomizeBtn');
const sortBtn = document.getElementById('sortBtn');
const clearBtn = document.getElementById('clearBtn');
const colorScheme = document.getElementById('colorScheme');
const soundToggle = document.getElementById('soundToggle');
const resultCard = document.getElementById('resultCard');
const resultValue = document.getElementById('resultValue');
const deleteBtn = document.getElementById('deleteBtn');
const closeBtn = document.getElementById('closeBtn');
const historyText = document.getElementById('historyText');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

const palettes = {
  classic: ['#ffb703', '#fb8500', '#219ebc', '#8ecae6', '#e63946', '#f1faee'],
  pastel: ['#f4d06f', '#a0ced9', '#ffc8dd', '#cdb4db', '#b7e4c7', '#ffd6a5'],
  vivid: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f77f00', '#8338ec'],
  forest: ['#2a9d8f', '#264653', '#e9c46a', '#f4a261', '#8ab17d', '#f6bd60'],
};

let entries = [];
let currentAngle = 0;
let isSpinning = false;
let lastSelected = null;

function parseEntries() {
  entries = inputText.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function drawWheel() {
  const size = Math.min(canvas.width, canvas.height);
  const radius = size / 2 - 16;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  if (entries.length === 0) {
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.font = '20px "Zen Kaku Gothic New", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('入力してください', 0, 0);
    ctx.restore();
    return;
  }

  const slice = (Math.PI * 2) / entries.length;
  const colors = palettes[colorScheme.value] || palettes.classic;

  for (let i = 0; i < entries.length; i += 1) {
    const start = currentAngle + i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    ctx.save();
    ctx.rotate(start + slice / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1f2937';
    ctx.font = '16px "Zen Kaku Gothic New", sans-serif';
    const label = entries[i].length > 14 ? `${entries[i].slice(0, 12)}…` : entries[i];
    ctx.fillText(label, radius - 12, 6);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  canvas.width = Math.floor(size * window.devicePixelRatio);
  canvas.height = Math.floor(size * window.devicePixelRatio);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  drawWheel();
}

function shuffleArray(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function randomIndex(max) {
  if (window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return buffer[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function playTone(freq, duration) {
  if (!soundToggle.checked) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const audioCtx = new AudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = freq;
  gainNode.gain.value = 0.08;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}

function spinWheel() {
  if (isSpinning || entries.length === 0) return;
  isSpinning = true;

  const slice = (Math.PI * 2) / entries.length;
  const index = randomIndex(entries.length);
  const pointerAngle = -Math.PI / 2;
  const targetAngle = pointerAngle - (index + 0.5) * slice;
  const spins = 6;
  const finalAngle = targetAngle - spins * Math.PI * 2;
  const startAngle = currentAngle;
  const duration = 4200;
  const startTime = performance.now();

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);
    currentAngle = startAngle + (finalAngle - startAngle) * eased;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      lastSelected = entries[index];
      showResult(lastSelected);
      playTone(620, 160);
    }
  }

  playTone(420, 120);
  requestAnimationFrame(animate);
}

function showResult(value) {
  resultValue.textContent = value;
  resultCard.classList.add('is-open');
  historyText.textContent += `${value}\n`;
}

function closeResult() {
  resultCard.classList.remove('is-open');
}

function deleteSelected() {
  if (!lastSelected) return;
  entries = entries.filter((entry) => entry !== lastSelected);
  inputText.value = entries.join('\n');
  lastSelected = null;
  closeResult();
  drawWheel();
}

inputText.addEventListener('input', () => {
  parseEntries();
  drawWheel();
});

randomizeBtn.addEventListener('click', () => {
  parseEntries();
  entries = shuffleArray(entries);
  inputText.value = entries.join('\n');
  drawWheel();
});

sortBtn.addEventListener('click', () => {
  parseEntries();
  entries.sort((a, b) => a.localeCompare(b, 'ja'));
  inputText.value = entries.join('\n');
  drawWheel();
});

clearBtn.addEventListener('click', () => {
  inputText.value = '';
  parseEntries();
  drawWheel();
});

colorScheme.addEventListener('change', drawWheel);
spinBtn.addEventListener('click', spinWheel);
closeBtn.addEventListener('click', closeResult);
deleteBtn.addEventListener('click', deleteSelected);
clearHistoryBtn.addEventListener('click', () => {
  historyText.textContent = '';
});

window.addEventListener('resize', resizeCanvas);

parseEntries();
resizeCanvas();
