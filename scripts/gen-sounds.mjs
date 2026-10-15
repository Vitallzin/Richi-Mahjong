// Gera os efeitos sonoros do jogo por síntese (arte original, sem licenças de terceiros).
// Uso: `npm run sounds` ⇒ public/sounds/*.wav (mono, 16 bits, 32 kHz).
//
// Técnicas: síntese modal (senoides inarmônicas com decaimento próprio) para pedra/madeira/gongo,
// ruído filtrado para os transientes e uma reverberação simples (filtros pente + passa-tudo) para
// dar ambiente de sala. Escala pentatônica chinesa (gong-shang-jue-zhi-yu) nos carrilhões.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RATE = 32000;
const OUT = path.resolve(import.meta.dirname, '..', 'public', 'sounds');

let seed = 20261014;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));
const at = (s) => Math.floor(s * RATE);

/** Modo ressonante: senoide com ataque curto e decaimento exponencial. */
function mode(buf, { t = 0, f, a, decay, attack = 0.002, phase = 0 }) {
  const start = at(t);
  const len = Math.min(buf.length - start, at(Math.min(8 / decay + 0.05, 4)));
  const w = (2 * Math.PI * f) / RATE;
  for (let i = 0; i < len; i++) {
    const tt = i / RATE;
    const env = Math.min(1, tt / attack) * Math.exp(-decay * tt);
    buf[start + i] += Math.sin(w * i + phase) * env * a;
  }
}

/** Ruído com passa-banda simples (dois polos), para estalos e fricção. */
function noise(buf, { t = 0, dur, a, decay, lo = 0.05, hi = 0.6 }) {
  const start = at(t);
  const len = Math.min(buf.length - start, at(dur));
  let low = 0;
  let band = 0;
  for (let i = 0; i < len; i++) {
    const x = rand() * 2 - 1;
    low += hi * (x - low);
    band += lo * (low - band);
    const env = Math.exp(-decay * (i / RATE));
    buf[start + i] += (low - band) * env * a;
  }
}

/** Reverberação de sala: 4 filtros pente em paralelo + 2 passa-tudo em série. */
function reverb(buf, { wet = 0.18, size = 1 } = {}) {
  const combs = [1116, 1188, 1277, 1356].map((d) => ({
    d: Math.floor(d * size * (RATE / 44100)),
    fb: 0.78,
  }));
  const out = new Float32Array(buf.length);
  for (const c of combs) {
    const line = new Float32Array(c.d);
    let idx = 0;
    let filt = 0;
    for (let i = 0; i < buf.length; i++) {
      const y = line[idx];
      filt = y * 0.7 + filt * 0.3; // amortecimento dos agudos
      line[idx] = buf[i] + filt * c.fb;
      idx = (idx + 1) % c.d;
      out[i] += y / combs.length;
    }
  }
  for (const d0 of [556, 441]) {
    const d = Math.floor(d0 * (RATE / 44100));
    const line = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const y = line[idx];
      const x = out[i];
      line[idx] = x + y * 0.5;
      out[i] = y - x * 0.5;
      idx = (idx + 1) % d;
    }
  }
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * (1 - wet) + out[i] * wet * 2.2;
  return buf;
}

// ---------- vozes ----------

/** Pedra de resina batendo no feltro sobre madeira: estalo seco + corpo grave + ressonância. */
function tileClack(buf, t = 0, loud = 1, pitch = 1) {
  noise(buf, { t, dur: 0.03, a: 0.9 * loud, decay: 180, lo: 0.08, hi: 0.85 });
  mode(buf, { t, f: 2650 * pitch, a: 0.28 * loud, decay: 70 });
  mode(buf, { t, f: 3870 * pitch, a: 0.16 * loud, decay: 95 });
  mode(buf, { t, f: 1420 * pitch, a: 0.22 * loud, decay: 45 });
  mode(buf, { t, f: 190 * pitch, a: 0.5 * loud, decay: 28, attack: 0.004 }); // mesa
  mode(buf, { t, f: 312 * pitch, a: 0.2 * loud, decay: 34 });
  noise(buf, { t: t + 0.006, dur: 0.08, a: 0.18 * loud, decay: 45, lo: 0.02, hi: 0.2 });
}

/** Sino de bronze (carrilhão): parciais inarmônicos típicos de sino. */
function bell(buf, t, f, a = 0.25, decay = 3.2) {
  const partials = [
    [0.5, 0.35, 0.8],
    [1, 1, 1],
    [1.19, 0.5, 1.3],
    [1.56, 0.35, 1.7],
    [2.0, 0.3, 2.1],
    [2.74, 0.18, 2.8],
    [3.76, 0.1, 3.6],
  ];
  for (const [ratio, amp, dk] of partials)
    mode(buf, { t, f: f * ratio, a: a * amp, decay: decay * dk, attack: 0.003 });
}

/** Gongo: muitos modos graves com leve variação, ataque macio. */
function gong(buf, t, f = 110, a = 0.5) {
  const ratios = [1, 1.52, 1.96, 2.43, 2.79, 3.31, 4.05, 4.67, 5.43];
  ratios.forEach((r, i) =>
    mode(buf, {
      t,
      f: f * r * (1 + (rand() - 0.5) * 0.004),
      a: a / (1 + i * 0.45),
      decay: 0.9 + i * 0.35,
      attack: 0.012,
    }),
  );
  noise(buf, { t, dur: 0.12, a: 0.12, decay: 30, lo: 0.01, hi: 0.15 });
}

// Pentatônica chinesa em Ré (宫商角徵羽): D E F# A B.
const P = {
  D5: 587.3,
  E5: 659.3,
  Fs5: 740,
  A5: 880,
  B5: 987.8,
  D6: 1174.7,
  E6: 1318.5,
  A4: 440,
  B4: 493.9,
  D4: 293.7,
  A3: 220,
};

const sounds = {
  discard: () => reverb(((b) => (tileClack(b, 0, 1), b))(buffer(0.5)), { wet: 0.12 }),
  draw: () => {
    const b = buffer(0.25);
    noise(b, { dur: 0.06, a: 0.15, decay: 60, lo: 0.03, hi: 0.3 }); // deslizar
    tileClack(b, 0.035, 0.32, 1.15);
    return reverb(b, { wet: 0.08 });
  },
  chi: () => {
    const b = buffer(1.1);
    tileClack(b, 0, 0.8);
    bell(b, 0.04, P.E5, 0.16);
    bell(b, 0.12, P.A5, 0.16);
    return reverb(b, { wet: 0.2 });
  },
  pon: () => {
    const b = buffer(1.2);
    tileClack(b, 0, 0.9);
    tileClack(b, 0.05, 0.6, 0.97);
    bell(b, 0.05, P.D5, 0.18);
    bell(b, 0.13, P.A5, 0.18);
    return reverb(b, { wet: 0.2 });
  },
  kan: () => {
    const b = buffer(1.5);
    [0, 0.05, 0.1].forEach((t, i) => tileClack(b, t, 0.85 - i * 0.15, 1 - i * 0.02));
    bell(b, 0.1, P.D5, 0.17);
    bell(b, 0.18, P.Fs5, 0.17);
    bell(b, 0.26, P.A5, 0.17);
    return reverb(b, { wet: 0.22 });
  },
  riichi: () => {
    const b = buffer(2);
    // bastão de madeira pousando + sino ascendente
    mode(b, { f: 880, a: 0.25, decay: 30 });
    mode(b, { f: 1390, a: 0.15, decay: 40 });
    noise(b, { dur: 0.04, a: 0.4, decay: 120 });
    [P.A4, P.D5, P.E5, P.A5].forEach((f, i) => bell(b, 0.08 + i * 0.09, f, 0.15, 2.4));
    return reverb(b, { wet: 0.28, size: 1.2 });
  },
  ron: () => {
    const b = buffer(3);
    gong(b, 0, 98, 0.55);
    [P.D5, P.Fs5, P.A5, P.D6, P.E6].forEach((f, i) => bell(b, 0.35 + i * 0.11, f, 0.14, 1.8));
    return reverb(b, { wet: 0.3, size: 1.4 });
  },
  tsumo: () => {
    const b = buffer(3);
    tileClack(b, 0, 1);
    gong(b, 0.05, 104, 0.5);
    [P.A4, P.D5, P.E5, P.A5, P.D6].forEach((f, i) => bell(b, 0.4 + i * 0.11, f, 0.14, 1.8));
    return reverb(b, { wet: 0.3, size: 1.4 });
  },
  handEnd: () => {
    const b = buffer(2.2);
    bell(b, 0, P.A5, 0.16, 2);
    bell(b, 0.22, P.E5, 0.16, 2);
    bell(b, 0.44, P.D5, 0.18, 1.6);
    return reverb(b, { wet: 0.3, size: 1.3 });
  },
  roundStart: () => {
    const b = buffer(2.6);
    gong(b, 0, 73, 0.45);
    return reverb(b, { wet: 0.32, size: 1.5 });
  },
  timeWarning: () => {
    const b = buffer(0.6);
    bell(b, 0, P.B5, 0.18, 9);
    bell(b, 0.18, P.B5, 0.18, 9);
    return reverb(b, { wet: 0.12 });
  },
  click: () => {
    const b = buffer(0.18);
    mode(b, { f: 2200, a: 0.18, decay: 60 });
    mode(b, { f: 3300, a: 0.08, decay: 80 });
    noise(b, { dur: 0.01, a: 0.15, decay: 300 });
    return reverb(b, { wet: 0.1 });
  },
  stamp: () => {
    const b = buffer(1);
    // selo de madeira batendo no papel + reverberação de sala
    noise(b, { dur: 0.05, a: 0.9, decay: 80, lo: 0.02, hi: 0.4 });
    mode(b, { f: 120, a: 0.7, decay: 18, attack: 0.003 });
    mode(b, { f: 240, a: 0.3, decay: 25 });
    bell(b, 0.02, P.D5, 0.12, 3);
    return reverb(b, { wet: 0.25, size: 1.2 });
  },
  whoosh: () => {
    const b = buffer(1);
    const len = b.length;
    let low = 0;
    for (let i = 0; i < len; i++) {
      const p = i / len;
      const env = Math.sin(Math.PI * p) ** 2;
      low += (0.02 + 0.25 * p) * (rand() * 2 - 1 - low);
      b[i] += low * env * 0.9;
    }
    return reverb(b, { wet: 0.2 });
  },
  scoreTick: () => {
    const b = buffer(0.35);
    // moedas: dois modos metálicos curtos
    mode(b, { f: 4200, a: 0.14, decay: 45 });
    mode(b, { f: 5630, a: 0.09, decay: 55 });
    mode(b, { f: 2970, a: 0.07, decay: 40 });
    return reverb(b, { wet: 0.15 });
  },
  yourTurn: () => {
    const b = buffer(1);
    bell(b, 0, P.D6, 0.1, 4);
    bell(b, 0.09, P.A5, 0.08, 4);
    return reverb(b, { wet: 0.2 });
  },
};

function toWav(samples) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const norm = peak > 0 ? 0.9 / peak : 1;
  // pequeno fade-out final para não estalar
  const fade = Math.min(samples.length, at(0.03));
  for (let i = 0; i < fade; i++) samples[samples.length - 1 - i] *= i / fade;
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
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
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
