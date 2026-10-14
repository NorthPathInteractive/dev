import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

const VERSION = '0.2.1';
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const status = document.querySelector('#status');
const speak = document.querySelector('#speak');
const voiceSelect = document.querySelector('#voice');
const player = document.querySelector('#player');
const diagnostics = document.querySelector('#diagnostics');
let tts;
let objectUrl;

function log(message) {
  const time = new Date().toLocaleTimeString();
  diagnostics.textContent += `\n[${time}] ${message}`;
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

  status.textContent = 'Ready to generate speech.';
  return tts;
}

speak.addEventListener('click', async () => {
  log('Speak button pressed.');
  try {
    speak.disabled = true;
    const engine = await loadTTS();
    status.textContent = 'Generating speech locally…';
    log(`Generating speech with ${voiceSelect.value || 'am_michael'}…`);
    const audio = await engine.generate(document.querySelector('#text').value, {
      voice: voiceSelect.value || 'am_michael',
      speed: Number(document.querySelector('#speed').value),
    });
    log('Speech generation completed.');
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const wav = audio.toBlob();
    objectUrl = URL.createObjectURL(wav);
    player.src = objectUrl;
    await player.play();
    status.textContent = 'Playing local Kokoro speech.';
    log('Audio playback started.');
  } catch (error) {
    console.error(error);
    const message = error?.stack || error?.message || String(error);
    status.textContent = `Error: ${error?.message || error}`;
    log(`ERROR: ${message}`);
  } finally {
    speak.disabled = false;
  }
});
