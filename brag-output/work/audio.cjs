// Synthesizes the 20s score + SFX in D minor, 120 BPM, to work/score.wav
const fs = require('fs');
const path = require('path');

const SR = 48000, DUR = 20, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);        // dry bus
const SL = new Float32Array(N), SRb = new Float32Array(N);     // reverb send
const TAU = Math.PI * 2;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const add = (i, l, r, send = 0) => {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r; SL[i] += l * send; SRb[i] += r * send;
};

// ── Pad: detuned saws through a slow lowpass, per chord with crossfades ──
const chords = [
  [0.0, 3.0, [50, 53, 57, 62], 0.55],          // Dm
  [3.0, 7.0, [46, 50, 53, 58], 0.6],           // Bb
  [7.0, 10.5, [53, 57, 60, 65], 0.65],         // F
  [10.5, 14.0, [48, 52, 55, 60, 64], 0.65],    // C
  [14.0, 15.5, [43, 55, 58, 62], 0.7],         // Gm
  [15.5, 17.0, [45, 52, 57, 61, 64], 0.75],    // A (dominant, tension)
  [17.0, 20.0, [38, 50, 57, 62, 64, 65, 69], 0.95], // Dm(add9) — the landing
];
for (const [a, b, notes, lvl] of chords) {
  const i0 = Math.floor(Math.max(0, a - 0.25) * SR), i1 = Math.min(N, Math.floor((b + 0.6) * SR));
  notes.forEach((m, k) => {
    const f = mtof(m);
    const det = [0.9965, 1, 1.0035];
    const ph = det.map(() => rnd());
    let lp = 0;
    const pan = ((k % 2) ? 0.35 : -0.35) * (k / notes.length);
    for (let i = i0; i < i1; i++) {
      const t = i / SR;
      const att = clamp((t - (a - 0.25)) / 0.5, 0, 1);
      const rel = clamp((b + 0.6 - t) / 0.6, 0, 1);
      const env = Math.sin(att * Math.PI / 2) * Math.sin(rel * Math.PI / 2);
      let s = 0;
      for (let d = 0; d < 3; d++) { const x = (t * f * det[d] + ph[d]) % 1; s += 2 * x - 1; }
      // Filter opens across the video and blooms on the landing chord.
      const cutoff = 500 + 900 * (t / 20) + (t > 17 ? 1400 * Math.exp(-(t - 17) * 1.2) : 0);
      const al = 1 - Math.exp(-TAU * cutoff / SR);
      lp += al * (s / 3 - lp);
      const v = lp * env * lvl * 0.075 * (m < 45 ? 1.2 : 1);
      add(i, v * (1 - pan), v * (1 + pan), 0.45);
    }
  });
}

// ── Sub bass: chord root, pulsing 8ths from the first reveal, ducked on beats ──
const roots = [[3.0, 7.0, 34], [7.0, 10.5, 41], [10.5, 14.0, 36], [14.0, 15.5, 31], [15.5, 17.0, 33]];
for (const [a, b, m] of roots) {
  const f = mtof(m + 12);
  for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) {
    const t = i / SR, beat = (t % 0.25) / 0.25;
    const duck = 0.35 + 0.65 * Math.min(1, beat * 3);
    const edge = clamp((t - a) / 0.05, 0, 1) * clamp((b - t) / 0.05, 0, 1);
    const v = Math.sin(TAU * f * t) * 0.16 * duck * edge * (t < 7 ? 0.6 : 1);
    add(i, v, v);
  }
}

// ── Kick: soft, felt more than heard, on quarter notes 7.0–16.5 ──
const kick = (t0, g = 1) => {
  const i0 = Math.floor(t0 * SR);
  let ph = 0;
  for (let j = 0; j < SR * 0.4; j++) {
    const t = j / SR;
    const f = 45 + 90 * Math.exp(-t * 30);
    ph += f / SR;
    const v = Math.sin(TAU * ph) * Math.exp(-t * 9) * 0.3 * g;
    add(i0 + j, v, v);
  }
};
for (let t = 7.0; t < 16.5; t += 0.5) kick(t, t >= 14 ? 1.1 : 0.85);

// ── Arp pluck: 8th-note chord tones with a ping-pong delay feel ──
const pluck = (t0, m, g, pan) => {
  const f = mtof(m), i0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * 0.9; j++) {
    const t = j / SR;
    const s = Math.sin(TAU * f * t) * 0.7 + Math.sin(TAU * f * 2 * t) * 0.2 * Math.exp(-t * 12);
    lp += 0.25 * (s - lp);
    const v = lp * Math.exp(-t * 6) * g;
    add(i0 + j, v * (1 - pan), v * (1 + pan), 0.55);
  }
};
const arpSets = [[7.0, 10.5, [65, 69, 72, 77]], [10.5, 14.0, [64, 67, 72, 76]], [14.0, 15.5, [67, 70, 74, 79]], [15.5, 17.0, [69, 73, 76, 81]]];
for (const [a, b, notes] of arpSets) {
  let k = 0;
  for (let t = a; t < b - 0.01; t += 0.25, k++) {
    const g = 0.05 * (0.7 + 0.3 * ((k % 4) === 0)) * (t > 15.5 ? 1.25 : 1);
    pluck(t, notes[k % notes.length], g, (k % 2 ? 0.4 : -0.4));
    pluck(t + 0.375, notes[k % notes.length], g * 0.35, (k % 2 ? -0.5 : 0.5)); // echo
  }
}

// ── Hook hits: low boom + air on each line ──
const boom = (t0, g) => {
  const i0 = Math.floor(t0 * SR);
  let ph = 0, lp = 0;
  for (let j = 0; j < SR * 1.6; j++) {
    const t = j / SR;
    ph += (38 + 60 * Math.exp(-t * 14)) / SR;
    lp += 0.04 * (noise() - lp);
    const v = (Math.sin(TAU * ph) * Math.exp(-t * 3.2) * 0.5 + lp * Math.exp(-t * 8) * 0.25) * g;
    add(i0 + j, v, v, 0.35);
  }
};
boom(0.1, 0.55); boom(0.7, 0.6); boom(1.3, 0.8);

// ── Bandpassed noise swell (riser / whoosh) ──
const swell = (a, b, f0, f1, g, send = 0.5) => {
  let low = 0, band = 0;
  for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) {
    const x = (i / SR - a) / (b - a);
    const f = f0 * Math.pow(f1 / f0, x);
    const F = 2 * Math.sin(Math.PI * Math.min(f, 8000) / SR);
    const q = 0.35;
    const n = noise();
    low += F * band; const high = n - low - q * band; band += F * high;
    const env = Math.pow(x, 2.2) * clamp((1 - x) / 0.04, 0, 1);
    const v = band * env * g;
    const w = Math.sin(x * 9) * 0.3;
    add(i, v * (1 - w), v * (1 + w), send);
  }
};
swell(3.55, 4.62, 300, 5000, 0.16);   // scan build
swell(6.55, 7.02, 600, 3500, 0.09);   // whoosh into events
swell(10.05, 10.52, 600, 3500, 0.09); // whoosh into analytics
swell(13.55, 14.02, 600, 3500, 0.09); // whoosh into dashboard
swell(15.3, 17.0, 200, 7000, 0.2);    // big build into the logo

// ── Bell: in-key partials, used for scan success and the landing ──
const bell = (t0, m, g, pan = 0) => {
  const f = mtof(m), i0 = Math.floor(t0 * SR);
  const parts = [[1, 1, 3.2], [2.0, 0.35, 5], [3.0, 0.14, 7], [4.2, 0.06, 9]];
  for (let j = 0; j < SR * 2.8; j++) {
    const t = j / SR;
    let s = 0;
    for (const [r, a, d] of parts) s += Math.sin(TAU * f * r * t) * a * Math.exp(-t * d);
    const v = s * g * Math.min(1, t * 400);
    add(i0 + j, v * (1 - pan), v * (1 + pan), 0.6);
  }
};
bell(4.62, 81, 0.09, -0.1);  // A5
bell(4.70, 86, 0.07, 0.15);  // D6 — the "checked in" ping, a fifth up
bell(9.55, 93, 0.018);       // soft click-tick on "Issue certificates"
[14.55, 15.15, 15.75, 16.35].forEach((t, k) => bell(t, [81, 84, 86, 88][k], 0.016, k % 2 ? 0.3 : -0.3)); // feed blips

// ── Landing impact ──
boom(17.0, 1.25);
bell(17.0, 74, 0.08, -0.2); bell(17.0, 81, 0.06, 0.2); bell(17.02, 86, 0.045, 0); bell(17.45, 88, 0.03, 0.3);

// ── Reverb (Schroeder: 4 combs + 2 allpasses per side) on the send bus ──
const verb = (inp, offs) => {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.floor((d + offs) * SR / 44100));
  for (const d of combs) {
    const buf = new Float32Array(d); let k = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[k];
      lp = y * 0.7 + lp * 0.3;
      buf[k] = inp[i] + lp * 0.86;
      out[i] += y * 0.25;
      k = (k + 1) % d;
    }
  }
  for (const d0 of [225, 556]) {
    const d = Math.floor((d0 + offs) * SR / 44100), buf = new Float32Array(d); let k = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[k], y = -out[i] + b;
      buf[k] = out[i] + b * 0.5;
      out[i] = y;
      k = (k + 1) % d;
    }
  }
  return out;
};
const vL = verb(SL, 0), vR = verb(SRb, 23);

// ── Master: sum, gentle glue, fade, normalize ──
const outL = new Float32Array(N), outR = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeIn = Math.min(1, t / 0.05);
  const fadeOut = t > 18.6 ? Math.pow(clamp((20 - t) / 1.4, 0, 1), 1.5) : 1;
  const l = Math.tanh((L[i] + vL[i] * 0.32) * 1.3) * fadeIn * fadeOut;
  const r = Math.tanh((R[i] + vR[i] * 0.32) * 1.3) * fadeIn * fadeOut;
  outL[i] = l; outR[i] = r;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
}
const norm = 0.89 / peak; // ≈ -1 dBFS

const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(clamp(outL[i] * norm, -1, 1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clamp(outR[i] * norm, -1, 1) * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(__dirname, 'score.wav'), buf);
console.log('score.wav written, pre-norm peak', peak.toFixed(3));
