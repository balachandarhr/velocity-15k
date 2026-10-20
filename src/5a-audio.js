// ---------------------------------------------------------------- audio
const Sound = {
  ac: null, master: null, eng: null,
  init() {
    if (this.ac) { if (this.ac.state !== 'running') this.ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = settings.sound ? 0.5 : 0; this.master.connect(this.ac.destination);
      const o1 = this.ac.createOscillator(), o2 = this.ac.createOscillator(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o1.start(); o2.start(); this.eng = { o1, o2, f, g };
    } catch (e) { this.ac = null; }
  },
  enable(on) { if (this.master) this.master.gain.value = on ? 0.5 : 0; if (on && this.ac) this.init(); },
  engine(kmh, on) {
    if (!this.eng) return; const t = this.ac.currentTime, fr = 40 + kmh * 1.4 + (kmh > 100 ? 25 : 0);
    this.eng.o1.frequency.setTargetAtTime(fr, t, 0.06); this.eng.o2.frequency.setTargetAtTime(fr * 0.5, t, 0.06);
    this.eng.f.frequency.setTargetAtTime(350 + kmh * 10, t, 0.1); this.eng.g.gain.setTargetAtTime(on ? 0.06 : 0, t, 0.12);
  },
  tone(freq, dur, type = 'square', vol = 0.15, slide) {
    if (!this.ac || !settings.sound) return; const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol) {
    if (!this.ac || !settings.sound) return; const n = Math.floor(this.ac.sampleRate * dur), b = this.ac.createBuffer(1, n, this.ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ac.createBufferSource(), g = this.ac.createGain(); g.gain.value = vol; s.buffer = b; s.connect(g); g.connect(this.master); s.start();
  },
  beep(go) { this.tone(go ? 880 : 440, go ? 0.6 : 0.22, 'square', 0.16); },
  boost() { this.tone(260, 0.45, 'sawtooth', 0.12, 1100); [660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.09, 'triangle', 0.15), i * 55)); },
  bump() { this.noise(0.18, 0.35); this.tone(110, 0.18, 'sine', 0.3, 45); },
  finish() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.18), i * 140)); }
};

