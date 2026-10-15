import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

const VERSION = '0.5.0';
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DTYPE = 'q4';
const DEVICE = 'webgpu';
const status = document.querySelector('#status');
const diagnostics = document.querySelector('#diagnostics');
const run = document.querySelector('#run');
const timer = document.querySelector('#timer');
const player = document.querySelector('#player');
let tts;
let objectUrl;
let interval;

function log(message) {
  diagnostics.textContent += `\n[${new Date().toLocaleTimeString()}] ${message}`;
}
function startTimer(label) {
  const start = performance.now();
  clearInterval(interval);
  interval = setInterval(() => {
    timer.textContent = `${label}: ${((performance.now()-start)/1000).toFixed(1)} s`;
  },100);
  return start;
}
function stopTimer(start,label) {
  clearInterval(interval);
  const seconds=(performance.now()-start)/1000;
  timer.textContent=`${label}: ${seconds.toFixed(2)} s`;
  return seconds;
}
window.addEventListener('error',e=>log(`Window error: ${e.message}`));
window.addEventListener('unhandledrejection',e=>log(`Promise error: ${e.reason?.message || e.reason}`));

log(`JavaScript loaded — v${VERSION}`);
log(`Browser: ${navigator.userAgent}`);
log(`Configuration: ${DTYPE} on ${DEVICE}`);
log(`WebGPU exposed: ${navigator.gpu ? 'YES' : 'NO'}`);
status.textContent='Ready for Kokoro q4/WebGPU benchmark.';

async function loadTTS(){
  if(tts) return tts;
  status.textContent='Loading Kokoro q4 model onto WebGPU…';
  log(`Starting model load: ${MODEL} (${DTYPE}/${DEVICE})`);
  const start=startTimer('Model load');
  tts=await KokoroTTS.from_pretrained(MODEL,{dtype:DTYPE,device:DEVICE});
  const seconds=stopTimer(start,'Model load');
  log(`Model initialized in ${seconds.toFixed(2)} seconds.`);
  return tts;
}

run.addEventListener('click',async()=>{
  run.disabled=true;
  let start;
  try{
    if(!navigator.gpu) throw new Error('WebGPU is not available.');
    log('Kokoro q4/WebGPU test started.');
    const engine=await loadTTS();
    const text='A door stands ahead.';
    status.textContent='Generating speech with Kokoro on WebGPU…';
    log(`Generating ${text.length} characters with af_heart…`);
    start=startTimer('Generation');
    const audio=await engine.generate(text,{voice:'af_heart',speed:1});
    const seconds=stopTimer(start,'Generation');
    log(`Speech generation completed in ${seconds.toFixed(2)} seconds.`);
    if(objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(audio.toBlob());
    player.src=objectUrl;
    await player.play();
    status.textContent=`SUCCESS — speech generated in ${seconds.toFixed(2)} seconds.`;
    log('Audio playback started.');
  }catch(error){
    if(start) stopTimer(start,'Stopped');
    const message=error?.stack || error?.message || String(error);
    status.textContent=`ERROR: ${error?.message || error}`;
    log(`ERROR: ${message}`);
  }finally{
    run.disabled=false;
  }
});
