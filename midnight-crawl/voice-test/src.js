import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

const VERSION = '0.3.0';
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DTYPE = 'q4';
const DEVICE = 'wasm';
const status = document.querySelector('#status');
const speak = document.querySelector('#speak');
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

function startTimer(label = 'Generation') {
  const started = performance.now();
  clearInterval(timerInterval);
  timer.textContent = `${label} time: 0.0 s`;
  timerInterval = setInterval(() => {
    timer.textContent = `${label} time: ${((performance.now() - started) / 1000).toFixed(1)} s`;
  }, 100);
  return started;
}

function stopTimer(started, label = 'Generation') {
  clearInterval(timerInterval);
  const seconds = (performance.now() - started) / 1000;
  timer.textContent = `${label} time: ${seconds.toFixed(2)} s`;
  return seconds;
}

window.addEventListener('error', event => log(`Window error: ${event.message}`));
window.addEventListener('unhandledrejection', event => log(`Promise error: ${event.reason?.message || event.reason}`));

log(`JavaScript module loaded — v${VERSION}`);
log(`Browser: ${navigator.userAgent}`);
log(`Configuration: ${DTYPE} on ${DEVICE}`);
log(`WebGPU exposed by browser: ${'gpu' in navigator ? 'yes' : 'no'}`);
status.textContent = `Ready to test Kokoro ${DTYPE}/${DEVICE}.`;

async function loadTTS() {
  if (tts) return tts;
  status.textContent = `Loading Kokoro ${DTYPE} model…`;
  log(`Starting model load: ${MODEL} (${DTYPE}/${DEVICE})`);
  const started = performance.now();
  tts = await KokoroTTS.from_pretrained(MODEL, { dtype: DTYPE, device: DEVICE });
  log(`Model initialized in ${((performance.now() - started) / 1000).toFixed(2)} seconds.`);
  return tts;
}

speak.addEventListener('click', async () => {
  log('q4 performance test button pressed.');
  let started;
  try {
    speak.disabled = true;
    const engine = await loadTTS();
    const text = document.querySelector('#text').value;
    status.textContent = `Generating locally with ${DTYPE}/${DEVICE}…`;
    log(`Generating ${text.length} characters with af_heart…`);
    started = startTimer();
    const audio = await engine.generate(text, {
      voice: 'af_heart',
      speed: 1,
    });
    const seconds = stopTimer(started);
    log(`Speech generation completed in ${seconds.toFixed(2)} seconds.`);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const wav = audio.toBlob();
    objectUrl = URL.createObjectURL(wav);
    player.src = objectUrl;
    await player.play();
    status.textContent = `Success — q4 generated speech in ${seconds.toFixed(2)} seconds.`;
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
