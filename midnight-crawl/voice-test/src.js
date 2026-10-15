const VERSION = '0.7.0';
const status = document.querySelector('#status');
const diagnostics = document.querySelector('#diagnostics');
const run = document.querySelector('#run');

function log(message) {
  diagnostics.textContent += `\n[${new Date().toLocaleTimeString()}] ${message}`;
}

window.addEventListener('error', e => log(`Window error: ${e.message}`));
window.addEventListener('unhandledrejection', e => log(`Promise error: ${e.reason?.message || e.reason}`));

log(`JavaScript loaded — v${VERSION}`);
log(`Browser: ${navigator.userAgent}`);
log(`WebGPU exposed: ${navigator.gpu ? 'YES' : 'NO'}`);
status.textContent = 'Ready. This test imports ONNX Runtime only after you press the button.';

run.addEventListener('click', async () => {
  run.disabled = true;
  try {
    log('Button pressed.');
    if (!navigator.gpu) throw new Error('WebGPU is not available.');

    status.textContent = 'Importing ONNX Runtime WebGPU…';
    const importStart = performance.now();
    const ort = await import('onnxruntime-web/webgpu');
    log(`ONNX Runtime import completed in ${((performance.now() - importStart) / 1000).toFixed(2)} s.`);
    log(`ort.env available: ${ort?.env ? 'YES' : 'NO'}`);
    log(`InferenceSession available: ${typeof ort?.InferenceSession === 'function' ? 'YES' : 'NO'}`);

    status.textContent = 'ONNX Runtime imported. Requesting a fresh GPU adapter/device…';
    const adapter = await navigator.gpu.requestAdapter();
    log(`GPU adapter acquired: ${adapter ? 'YES' : 'NO'}`);
    if (!adapter) throw new Error('requestAdapter() returned null.');
    const device = await adapter.requestDevice();
    log(`GPU device acquired: ${device ? 'YES' : 'NO'}`);

    status.textContent = 'SUCCESS: ONNX Runtime WebGPU loaded and Safari still has a usable GPU device.';
    log('RESULT: ONNX Runtime WebGPU can load on this iPhone. Kokoro is the next layer to isolate.');
  } catch (error) {
    const message = error?.stack || error?.message || String(error);
    status.textContent = `ERROR: ${error?.message || error}`;
    log(`ERROR: ${message}`);
  } finally {
    run.disabled = false;
  }
});
