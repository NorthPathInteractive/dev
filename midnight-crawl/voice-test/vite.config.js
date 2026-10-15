import { defineConfig } from 'vite';

export default defineConfig({
  base: '/dev/midnight-crawl/voice-test-vite/',
  build: {
    outDir: '../voice-test-vite',
    emptyOutDir: true,
  },
});
