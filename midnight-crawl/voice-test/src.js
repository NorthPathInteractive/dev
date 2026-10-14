import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

const VERSION = '0.2.2';
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const status = document.querySelector('#status');
const speak = document.querySelector('#speak');
const voiceSelect = document.querySelector('#voice');
const player = document.querySelector('#player');
const diagnostics = document.querySelector('#diagnostics');
const timer = document.querySelector('#timer');
let tts;
let objectUrl;
let timerInterval;

function log(message) {
  const time = new Date().toLocaleTimeString();
  diagnostics.textContent += `\n[${time}] ${message}`;
}

function startTimer() {
  const started = performance.now();
  clearInterval(timerInterval);
  timer.textContent = 'Generation time: 0.0 s';
  timerInterval = setInterval(() => {
    timer.textContent = `Generation time: ${((performance.now() - started) / 1000).toFixed(1)} s`;
  }, 100);
  return started;
}

function stopTimer(started) {
  clearInterval(timerInterval);
  const seconds = (performance.now() - started) / 1000;
  timer.textContent = `Generation time: ${seconds.toFixed(2)} s`;
  return seconds;
}

window.addEventListener('error', event => log(`Window error: ${event.message}`));
window.addEventListener('unhandledrejection', event => log(`Promise error: ${event.reason?.message || event.reason}`));

log(`JavaScript module loaded — v${VERSION}`);
log(`Browser: ${navigator.userAgent}`);
log('Kokoro library import succeeded.');
status.textContent = 'Kokoro module loaded. Ready to initialize model.';

async function loadTTS() {
  if (tts) return tts;
  status.textContent = 'Downloading/loading Kokoro model…';
  log(`Starting model load: ${MODEL}`);
  tts = await KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm' });
  log('Model initialized successfully.');

  const voices = tts.list_voices();
  log(`Voice API returned: ${Array.isArray(voices) ? voices.length + ' voices' : typeof voices}`);

  if (Array.isArray(voices)) {
    for (const voice of voices) {
      const name = typeof voice === 'string' ? voice : voice.name;
      const option = document.createElement('option');
      option.value = name;
      option.textContent = typeof voice === 'string' ? voice : `${name}${voice.language ? ` — ${voice.language}` : ''}`;
      if (name === 'am_michael') option.selected = true;
      voiceSelect.append(option);
    }
  }

  if (!voiceSelect.value) {
    const option = document.createElement('option');
    option.value = 'am_michael';
    option.textContent = 'am_michael';
    option.selected = true;
    voiceSelect.append(option);
  }

  status.textContent = 'Ready to run performance test.';
  return tts;
}

speak.addEventListener('click', async () => {
  log('Performance test button pressed.');
  let started;
  try {
    speak.disabled = true;
    const engine = await loadTTS();
    const text = document.querySelector('#text').value;
    status.textContent = 'Generating short speech test locally…';
    log(`Generating ${text.length} characters with ${voiceSelect.value || 'am_michael'}…`);
    started = startTimer();
    const audio = await engine.generate(text, {
      voice: voiceSelect.value || 'am_michael',
      speed: Number(document.querySelector('#speed').value),
    });
    const seconds = stopTimer(started);
    log(`Speech generation completed in ${seconds.toFixed(2)} seconds.`);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const wav = audio.toBlob();
    objectUrl = URL.createObjectURL(wav);
    player.src = objectUrl;
    await player.play();
    status.textContent = `Success — generated speech in ${seconds.toFixed(2)} seconds.`;
    log('Audio playback started.');
  } catch (error) {
    if (started) stopTimer(started);
    console.error(error);
    const message = error?.stack || error?.message || String(error);
    status.textContent = `Error: ${error?.message || error}`;
    log(`ERROR: ${message}`);
  } finally {
    speak.disabled = false;
  }
});
