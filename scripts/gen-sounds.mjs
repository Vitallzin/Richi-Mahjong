// Gera os efeitos sonoros do jogo por síntese (arte original, sem licenças de terceiros).
// Uso: `npm run sounds` ⇒ public/sounds/*.wav (mono, 16 bits, 22.050 Hz).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RATE = 22050;
const OUT = path.resolve(import.meta.dirname, '..', 'public', 'sounds');

// PRNG simples com semente para o ruído ficar igual a cada geração.
let seed = 12345;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));

function addTone(
  buf,
  { at = 0, freq, dur, gain = 0.3, decay = 6, harmonics = [1], attack = 0.004, sweepTo },
) {
  const start = Math.floor(at * RATE);
  const len = Math.floor(dur * RATE);
  let phase = 0;
  for (let i = 0; i < len && start + i < buf.length; i++) {
    const tt = i / RATE;
    const f = sweepTo ? freq + (sweepTo - freq) * (i / len) : freq;
    phase += (2 * Math.PI * f) / RATE;
    const env = Math.min(1, tt / attack) * Math.exp(-decay * tt);
    let v = 0;
    harmonics.forEach((h, k) => {
      v += Math.sin(phase * (k + 1)) * h;
    });
    buf[start + i] += v * env * gain;
  }
}

function addNoise(buf, { at = 0, dur, gain = 0.4, decay = 60, lowpass = 0.5 }) {
  const start = Math.floor(at * RATE);
  const len = Math.floor(dur * RATE);
  let y = 0;
  let prev = 0;
  for (let i = 0; i < len && start + i < buf.length; i++) {
    const x = rand() * 2 - 1;
    y += lowpass * (x - y); // passa-baixa
    const hp = y - prev; // passa-alta leve
    prev = y;
    buf[start + i] += (y * 0.6 + hp * 0.8) * Math.exp(-decay * (i / RATE)) * gain;
  }
}

function clack(buf, at = 0, loud = 1) {
  addNoise(buf, { at, dur: 0.09, gain: 0.55 * loud, decay: 55, lowpass: 0.55 });
  addTone(buf, { at, freq: 2300, dur: 0.05, gain: 0.18 * loud, decay: 90 });
  addTone(buf, { at, freq: 170, dur: 0.12, gain: 0.35 * loud, decay: 40 });
}

function chime(buf, notes, step = 0.07, gain = 0.22, decay = 5) {
  notes.forEach((freq, i) =>
    addTone(buf, { at: i * step, freq, dur: 0.9, gain, decay, harmonics: [1, 0.35, 0.12] }),
  );
}

const N = {
  C4: 261.63,
  G4: 392,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
  E6: 1318.5,
};

const sounds = {
  discard: () => {
    const b = buffer(0.25);
    clack(b, 0, 1);
    return b;
  },
  draw: () => {
    const b = buffer(0.15);
    clack(b, 0, 0.35);
    return b;
  },
  chi: () => {
    const b = buffer(0.8);
    clack(b, 0, 0.7);
    chime(b, [N.E5, N.G5], 0.06, 0.2);
    return b;
  },
  pon: () => {
    const b = buffer(0.8);
    clack(b, 0, 0.8);
    chime(b, [N.D5, N.A5], 0.05, 0.22);
    return b;
  },
  kan: () => {
    const b = buffer(1);
    clack(b, 0, 0.8);
    clack(b, 0.08, 0.6);
    chime(b, [N.C5, N.G5, N.C6], 0.06, 0.2);
    return b;
  },
  riichi: () => {
    const b = buffer(1.3);
    addTone(b, { freq: 380, sweepTo: 960, dur: 0.35, gain: 0.25, decay: 2, harmonics: [1, 0.3] });
    chime(b.subarray(Math.floor(0.3 * RATE)), [N.G5, N.C6, N.E6], 0.07, 0.22, 3.5);
    clack(b, 0.32, 1);
    return b;
  },
  ron: () => {
    const b = buffer(1.6);
    chime(b, [N.C5, N.E5, N.G5, N.C6, N.E6], 0.08, 0.2, 2.5);
    return b;
  },
  tsumo: () => {
    const b = buffer(1.6);
    clack(b, 0, 0.8);
    chime(b.subarray(Math.floor(0.08 * RATE)), [N.G4, N.C5, N.E5, N.G5, N.C6], 0.08, 0.2, 2.5);
    return b;
  },
  handEnd: () => {
    const b = buffer(1.2);
    chime(b, [N.G5, N.C5], 0.18, 0.2, 3);
    return b;
  },
  roundStart: () => {
    const b = buffer(1.6);
    addTone(b, {
      freq: N.C4,
      dur: 1.6,
      gain: 0.3,
      decay: 2.2,
      harmonics: [1, 0.5, 0.3, 0.15, 0.1],
    });
    return b;
  },
  timeWarning: () => {
    const b = buffer(0.35);
    addTone(b, { freq: 880, dur: 0.1, gain: 0.25, decay: 10 });
    addTone(b, { at: 0.16, freq: 880, dur: 0.1, gain: 0.25, decay: 10 });
    return b;
  },
  click: () => {
    const b = buffer(0.06);
    addTone(b, { freq: 1500, dur: 0.05, gain: 0.2, decay: 80 });
    return b;
  },
};

function toWav(samples) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const norm = peak > 0.95 ? 0.95 / peak : 1;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * norm)) * 32767), i * 2),
  );
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(sounds)) {
  writeFileSync(path.join(OUT, `${name}.wav`), toWav(make()));
  console.log(`som gerado: public/sounds/${name}.wav`);
}
