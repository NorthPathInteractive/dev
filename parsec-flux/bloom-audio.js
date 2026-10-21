/* Sample instruments for Bloom; all audio routes through the game master. */
class FluxAudio {
  constructor(ctx, master) {
    this.ctx = ctx; this.master = master; this.buffers = new Map();
    this.worldNodes = []; this.pads = []; this.voice = null;
    this.worldGain = ctx.createGain(); this.worldGain.connect(master);
  }
  async load() {
    const names = ['bloom-pad-c3', 'bloom-glass-c5', 'bloom-heartbeat',
      ...Array.from({length: 8}, (_, i) => `world-${i + 1}`),
      'one-life', 'two-lives', 'game-over'];
    await Promise.all(names.map(async name => {
      if (this.buffers.has(name)) return;
      const response = await fetch(`audio/${name}.mp3?v=0.6.0`);
      if (!response.ok) throw new Error(`Audio unavailable: ${name}`);
      this.buffers.set(name, await this.ctx.decodeAudioData(await response.arrayBuffer()));
    }));
  }
  source(name, gain, target = this.worldGain, rate = 1, loop = false) {
    const o = this.ctx.createBufferSource(), g = this.ctx.createGain();
    o.buffer = this.buffers.get(name); o.playbackRate.value = rate; o.loop = loop;
    if (loop) { o.loopStart = 0; o.loopEnd = 12; }
    g.gain.value = gain; o.connect(g); g.connect(target);
    o.onended = () => { o.disconnect(); g.disconnect(); };
    return {o, g};
  }
  startBloom() {
    this.stopWorld(); this.worldGain.gain.value = 1;
    this.addPad(0);
    const bass = this.source('bloom-heartbeat', .30, this.worldGain, 1, true);
    bass.o.start(); this.worldNodes.push(bass);
  }
  addPad(index) {
    const ratios = [1, 164.8138 / 130.8128, 196 / 130.8128, 246.9417 / 130.8128, 293.6648 / 130.8128];
    const node = this.source('bloom-pad-c3', 0, this.worldGain, ratios[index], true);
    const now = this.ctx.currentTime;
    node.g.gain.setValueAtTime(0, now);
    node.g.gain.linearRampToValueAtTime(index === 4 ? .10 : .23, now + 1.8);
    node.o.start(); this.pads.push(node);
  }
  resetChord() {
    const now = this.ctx.currentTime;
    this.pads.splice(1).forEach(n => {
      n.g.gain.cancelScheduledValues(now); n.g.gain.setTargetAtTime(0, now, .12);
      n.o.stop(now + .7);
    });
  }
  glass(frequency, duration, panStart = 0, panEnd = panStart, target = this.master) {
    const node = this.source('bloom-glass-c5', 0, target, frequency / 523.251);
    const pan = this.ctx.createStereoPanner();
    node.g.disconnect(); node.g.connect(pan); pan.connect(target);
    const now = this.ctx.currentTime;
    pan.pan.setValueAtTime(panStart, now); pan.pan.linearRampToValueAtTime(panEnd, now + duration);
    node.g.gain.setValueAtTime(.28, now);
    node.g.gain.linearRampToValueAtTime(.65, now + duration / 2);
    node.g.gain.linearRampToValueAtTime(0, now + duration);
    node.o.start(); node.o.stop(now + duration + .02);
    node.o.onended = () => { node.o.disconnect(); node.g.disconnect(); pan.disconnect(); };
    return node;
  }
  async announce(name) {
    if (this.voice) { try { this.voice.o.stop(); } catch {} }
    const node = this.source(name, .85, this.master);
    this.voice = node;
    this.worldGain.gain.setTargetAtTime(.26, this.ctx.currentTime, .035);
    return new Promise(resolve => {
      node.o.onended = () => {
        node.o.disconnect(); node.g.disconnect();
        if (this.voice === node) {
          this.voice = null;
          this.worldGain.gain.setTargetAtTime(1, this.ctx.currentTime, .2);
        }
        resolve();
      };
      node.o.start();
    });
  }
  lifePulses(count) {
    const now = this.ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const node = this.source('bloom-glass-c5', .5, this.master, count === 1 ? .5 : 1);
      node.o.start(now + i * .29); node.o.stop(now + i * .29 + .22);
      node.g.gain.setValueAtTime(.5, now + i * .29);
      node.g.gain.exponentialRampToValueAtTime(.001, now + i * .29 + .21);
    }
  }
  stopWorld() {
    [...this.worldNodes, ...this.pads].forEach(n => { try { n.o.stop(); } catch {} });
    this.worldNodes = []; this.pads = [];
  }
}
