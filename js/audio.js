// All sound is synthesized live with the Web Audio API: the smashes, the room
// murmur, and a 12-bar shuffle from the jukebox that gets woozier as you do.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

export class AudioSys {
  constructor() { this.ready = false; this.drunk = 0; }

  init() {
    if (this.ready) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);

    this.rev = ctx.createConvolver(); this.rev.buffer = this.impulse(2.8);
    const rg = ctx.createGain(); rg.gain.value = 0.4;
    this.rev.connect(rg); rg.connect(this.master);

    this.musicLP = ctx.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 8000;
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0.0;
    this.musicLP.connect(this.musicGain); this.musicGain.connect(this.master);

    const nb = this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    this.startMurmur();
    this.seq = 0; this.nextT = ctx.currentTime + 0.2;
    setInterval(() => this.sched(), 40);
    this.ready = true;
  }

  impulse(sec) {
    const ctx = this.ctx, n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    return b;
  }

  // ---- building blocks -------------------------------------------------
  out(pan = 0, wet = 0.3, vol = 1) {
    const ctx = this.ctx, g = ctx.createGain(), p = ctx.createStereoPanner();
    g.gain.value = vol; p.pan.value = clamp(pan, -1, 1);
    g.connect(p); p.connect(this.sfx);
    if (wet > 0) { const w = ctx.createGain(); w.gain.value = wet; p.connect(w); w.connect(this.rev); }
    return g;
  }

  tone(dest, type, f0, f1, t, dur, vol, detune = 0) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
  }

  burst(dest, type, f0, f1, q, t, dur, vol) {
    const ctx = this.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.03);
  }

  // ---- sound effects ---------------------------------------------------
  smash({ size = 1, pitch = 1, pan = 0, vol = 1, wet = 0.55 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, wet, vol);
    this.burst(o, 'bandpass', 950 * pitch, 950 * pitch, 1, t, 0.09, 0.9);
    this.burst(o, 'highpass', 2400 * pitch, 3200 * pitch, 0.7, t, 0.42 * size, 0.6);
    const n = 8 + 10 * size;
    for (let i = 0; i < n; i++)
      this.tone(o, i % 2 ? 'sine' : 'triangle', rnd(2400, 9000) * pitch, rnd(2400, 9000) * pitch, t + Math.random() * 0.5 * size, rnd(0.04, 0.2), rnd(0.03, 0.1));
  }
  ceramic({ pan = 0, vol = 1, pitch = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.5, vol);
    this.burst(o, 'bandpass', 1500 * pitch, 900 * pitch, 0.8, t, 0.26, 0.9);
    this.burst(o, 'lowpass', 420, 200, 0.7, t, 0.14, 0.9);
    for (let i = 0; i < 7; i++) this.tone(o, 'triangle', rnd(1100, 3600) * pitch, rnd(900, 3000) * pitch, t + Math.random() * 0.3, rnd(0.03, 0.1), rnd(0.04, 0.1));
  }
  thud({ pan = 0, vol = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.3, vol);
    this.tone(o, 'sine', 150, 48, t, 0.2, 0.8);
    this.burst(o, 'lowpass', 320, 120, 0.7, t, 0.12, 0.6);
  }
  squeak({ pan = 0, vol = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.3, vol);
    this.tone(o, 'square', 950, 2200, t, 0.09, 0.14);
    this.tone(o, 'square', 2200, 760, t + 0.1, 0.16, 0.14);
  }
  pop({ pan = 0, vol = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.4, vol);
    this.burst(o, 'highpass', 700, 700, 0.7, t, 0.07, 1.0);
    this.tone(o, 'sine', 320, 70, t, 0.08, 0.7);
  }
  gong({ f = 220, pan = 0, vol = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.6, vol);
    [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone(o, 'sine', f * m, f * m * 0.995, t, 2.4 / (i + 1), 0.32 / (i + 1)));
    this.burst(o, 'bandpass', f * 5, f * 5, 2, t, 0.04, 0.5);
  }
  ding({ f = 1320, pan = 0, vol = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.5, vol);
    this.tone(o, 'sine', f, f, t, 0.9, 0.3); this.tone(o, 'sine', f * 2.01, f * 2.01, t, 0.5, 0.12);
  }
  coins({ pan = 0, vol = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.4, vol);
    for (let i = 0; i < 10; i++) this.tone(o, 'sine', rnd(3200, 6400), rnd(3200, 6400), t + i * 0.045 + Math.random() * 0.02, 0.14, 0.09);
  }
  zap({ pan = 0, vol = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.4, vol);
    this.tone(o, 'sawtooth', 2600, 50, t, 0.38, 0.25);
    this.burst(o, 'highpass', 3000, 1500, 0.7, t, 0.3, 0.4);
  }
  splat({ pan = 0, vol = 1 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(pan, 0.35, vol);
    this.burst(o, 'lowpass', 1100, 250, 0.7, t, 0.25, 1.0);
    this.tone(o, 'sine', 190, 55, t, 0.17, 0.7);
    for (let i = 0; i < 5; i++) this.burst(o, 'bandpass', rnd(400, 900), 300, 3, t + 0.05 + Math.random() * 0.25, 0.05, 0.3);
  }
  pour() {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(0, 0.1, 1);
    this.burst(o, 'bandpass', 900, 2800, 4, t, 0.85, 0.35);
    this.tone(o, 'sine', 1900, 1900, t + 0.9, 0.25, 0.08);
  }
  gulp() {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(0, 0, 1);
    this.tone(o, 'sine', rnd(240, 290), 120, t, 0.09, 0.4);
  }
  hiccup() {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(0, 0.1, 1);
    this.tone(o, 'sine', 400, 900, t, 0.07, 0.3);
  }
  burp() {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(0, 0.15, 1);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 480; f.connect(o);
    this.tone(f, 'sawtooth', rnd(85, 110), 62, t, rnd(0.3, 0.6), 0.5);
  }
  whoosh() {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(0, 0.1, 1);
    this.burst(o, 'bandpass', 500, 2000, 1.2, t, 0.22, 0.35);
  }
  tick(f = 880) {
    if (!this.ready) return;
    this.tone(this.out(0, 0, 1), 'triangle', f, f, this.ctx.currentTime, 0.05, 0.15);
  }

  step(wood, vol = 1) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(0, wood ? 0.1 : 0.35, vol);
    if (wood) { this.burst(o, 'lowpass', 420, 180, 0.8, t, 0.07, 0.3); this.tone(o, 'sine', 95, 60, t, 0.07, 0.22); }
    else this.burst(o, 'bandpass', 1100, 700, 1, t, 0.05, 0.16);
  }
  ahh() {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(0, 0.1, 1);
    this.burst(o, 'bandpass', 1300, 650, 1.4, t, 0.55, 0.16);
  }
  cough() {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(0, 0.15, 1);
    [0, 0.17, 0.3].forEach((d, i) => { this.burst(o, 'bandpass', 700, 420, 1.2, t + d, 0.1, 0.5 - i * 0.12); this.tone(o, 'sawtooth', 150, 90, t + d, 0.08, 0.12); });
  }
  cheer(vol = 1) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(-0.5, 0.7, vol);
    [650, 1100, 2500].forEach(f => this.burst(o, 'bandpass', f, f * 1.15, 2.2, t, 1.3, 0.16));
    for (let i = 0; i < 5; i++) { const f = rnd(380, 620); this.tone(o, 'triangle', f, f * rnd(1.4, 1.9), t + Math.random() * 0.25, rnd(0.4, 0.8), 0.05); }
  }
  bell() {
    if (!this.ready) return;
    const t = this.ctx.currentTime, o = this.out(-0.3, 0.7, 1);
    [0, 0.45, 0.9].forEach(d => [1, 2.4, 3.9, 5.6].forEach((m, i) => this.tone(o, 'sine', 620 * m, 620 * m, t + d, 1.6 / (i + 1), 0.3 / (i + 1))));
  }

  // ---- ambience --------------------------------------------------------
  startMurmur() {
    const ctx = this.ctx;
    this.murmur = ctx.createGain(); this.murmur.gain.value = 0; this.murmur.connect(this.master);
    [[280, 0.23], [520, 0.31], [900, 0.41], [1500, 0.17]].forEach(([f, rate], i) => {
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.4;
      const g = ctx.createGain(); g.gain.value = 0.5 / (i + 1);
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate;
      const lg = ctx.createGain(); lg.gain.value = 0.3 / (i + 1);
      lfo.connect(lg); lg.connect(g.gain);
      s.connect(bp); bp.connect(g); g.connect(this.murmur);
      s.start(0, i * 0.3); lfo.start();
    });
  }

  // ---- jukebox: 12-bar shuffle in A, 12 triplet steps to the bar -------
  sched() {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    if (this.nextT < ctx.currentTime - 0.5) this.nextT = ctx.currentTime + 0.05;
    while (this.nextT < ctx.currentTime + 0.16) {
      this.playStep(this.seq, this.nextT);
      const bpm = 108 - this.drunk * 14;
      this.nextT += 60 / bpm / 3;
      this.seq++;
    }
  }

  playStep(s, t) {
    const M = this.musicLP;
    const bar = Math.floor(s / 12) % 12, pos = s % 12, beat = Math.floor(pos / 3), tri = pos % 3;
    const root = [110, 110, 110, 110, 146.83, 146.83, 110, 110, 164.81, 146.83, 110, 164.81][bar];
    const wob = Math.sin(t * 1.3) * this.drunk * 35;
    if (pos === 0 || pos === 6 || (pos === 8 && bar % 2)) this.tone(M, 'sine', 130, 42, t, 0.22, 0.9);
    if (pos === 3 || pos === 9) { this.burst(M, 'bandpass', 1900, 1900, 0.8, t, 0.16, 0.5); this.tone(M, 'triangle', 210, 150, t, 0.1, 0.3); }
    if (tri !== 1) this.burst(M, 'highpass', 7500, 7500, 0.7, t, 0.04, tri ? 0.07 : 0.14);
    if (tri !== 1) {
      const semi = [0, 4, 7, 9][beat];
      const f = root * Math.pow(2, semi / 12);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.connect(M);
      this.tone(lp, 'sawtooth', f, f, t, tri ? 0.14 : 0.24, 0.5, wob);
    }
    if (pos === 2 || pos === 8) {
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.connect(M);
      [1, 1.26, 1.498, 1.782].forEach(m => this.tone(lp, 'sawtooth', root * 2 * m, root * 2 * m, t, 0.13, 0.055, wob + rnd(-6, 6)));
    }
    if (bar % 4 === 3 && tri !== 1 && Math.random() < 0.7) {
      const n = [0, 3, 5, 6, 7, 10, 12, 15][Math.floor(Math.random() * 8)];
      const f = 440 * Math.pow(2, n / 12);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(M);
      this.tone(lp, 'square', f, f * (Math.random() < 0.3 ? 1.06 : 1), t, 0.22, 0.07, wob);
    }
  }

  // drunk 0..1, range 0..1 (in the warehouse), outside 0..1 (on the street)
  setMix(drunk, range, outside) {
    if (!this.ready) return;
    this.drunk = drunk;
    const t = this.ctx.currentTime;
    const far = Math.max(range, outside);
    this.musicGain.gain.setTargetAtTime(0.5 - 0.3 * far, t, 0.2);
    this.musicLP.frequency.setTargetAtTime((8500 - 6500 * range - 8000 * outside) * (1 - 0.7 * drunk) + 350, t, 0.2);
    this.murmur.gain.setTargetAtTime(0.16 * (1 - 0.75 * range) * (1 - 0.9 * outside), t, 0.3);
  }
}
