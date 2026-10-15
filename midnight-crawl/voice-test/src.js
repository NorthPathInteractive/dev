const VERSION = '0.4.0';
const status = document.querySelector('#status');
const diagnostics = document.querySelector('#diagnostics');
const run = document.querySelector('#run');

function log(message) {
  const time = new Date().toLocaleTimeString();
  diagnostics.textContent += `\n[${time}] ${message}`;
}

window.addEventListener('error', event => log(`Window error: ${event.message}`));
window.addEventListener('unhandledrejection', event => log(`Promise error: ${event.reason?.message || event.reason}`));

log(`JavaScript loaded — v${VERSION}`);
log(`Browser: ${navigator.userAgent}`);

async function testWebGPU() {
  run.disabled = true;
  try {
    const exposed = !!navigator.gpu;
    log(`navigator.gpu exposed: ${exposed ? 'YES' : 'NO'}`);
    if (!exposed) {
      status.textContent = 'WebGPU is not exposed to this Safari page.';
      log('RESULT: No WebGPU API available. Kokoro cannot use the WebGPU backend here.');
      return;
    }

    status.textContent = 'WebGPU API found. Requesting GPU adapter…';
    const started = performance.now();
    const adapter = await navigator.gpu.requestAdapter();
    log(`Adapter request completed in ${((performance.now() - started) / 1000).toFixed(2)} s.`);

    if (!adapter) {
      status.textContent = 'WebGPU exists, but Safari did not provide a GPU adapter.';
      log('RESULT: navigator.gpu exists, but requestAdapter() returned null.');
      return;
    }

    log('GPU adapter acquired successfully.');
    status.textContent = 'GPU adapter found. Requesting WebGPU device…';
    const device = await adapter.requestDevice();
    log(`GPU device acquired: ${device ? 'YES' : 'NO'}`);

    if (device) {
      status.textContent = 'SUCCESS: This iPhone can expose a usable WebGPU device to the webpage.';
      log('RESULT: WebGPU device is usable. Next test: run Kokoro with device="webgpu".');
    }
  } catch (error) {
    const message = error?.stack || error?.message || String(error);
    status.textContent = `WebGPU test error: ${error?.message || error}`;
    log(`ERROR: ${message}`);
  } finally {
    run.disabled = false;
  }
}

run.addEventListener('click', testWebGPU);
status.textContent = 'Ready. This test does not load Kokoro or generate speech.';
