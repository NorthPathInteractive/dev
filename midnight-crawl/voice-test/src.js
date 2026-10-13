import { KokoroTTS } from 'kokoro-js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const status = document.querySelector('#status');
const speak = document.querySelector('#speak');
const voiceSelect = document.querySelector('#voice');
const player = document.querySelector('#player');
let tts;
let objectUrl;

async function loadTTS() {
  if (tts) return tts;
  status.textContent = 'Downloading/loading Kokoro model…';
  tts = await KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm' });
  const voices = tts.list_voices();
  for (const voice of voices) {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name}${voice.language ? ` — ${voice.language}` : ''}`;
    if (voice.name === 'am_michael') option.selected = true;
    voiceSelect.append(option);
  }
  status.textContent = `Ready. ${voices.length} voices available.`;
  return tts;
}

speak.addEventListener('click', async () => {
  try {
    speak.disabled = true;
    const engine = await loadTTS();
    status.textContent = 'Generating speech locally…';
    const audio = await engine.generate(document.querySelector('#text').value, {
      voice: voiceSelect.value || 'af_heart',
      speed: Number(document.querySelector('#speed').value),
    });
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const wav = audio.toBlob();
    objectUrl = URL.createObjectURL(wav);
    player.src = objectUrl;
    await player.play();
    status.textContent = 'Playing local Kokoro speech.';
  } catch (error) {
    console.error(error);
    status.textContent = `Error: ${error.message}`;
  } finally {
    speak.disabled = false;
  }
});
