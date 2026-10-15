/**
 * Música ambiente generativa (decisão do desenvolvedor, ADR 0012): composta ao vivo no navegador,
 * sem arquivos. Cítara chinesa (guzheng) na pentatônica de Ré, colchão de quintas, baixo suave e
 * sinos de vento ocasionais, com reverberação. Dois climas: menu (mais melodia) e mesa (mais espaço,
 * para não atrapalhar a concentração).
 */
import { audioGraph } from './context';

export type MusicMood = 'menu' | 'table';

// Pentatônica de Ré (宫商角徵羽): D E F# A B, em semitons a partir de D.
const SCALE = [0, 2, 4, 7, 9];
const D3 = 146.83;

/** Frequência do grau `degree` (pode ser negativo ou passar de uma oitava). */
export function degreeToFreq(degree: number, base = D3): number {
  const octave = Math.floor(degree / SCALE.length);
  const step = SCALE[((degree % SCALE.length) + SCALE.length) % SCALE.length] ?? 0;
  return base * 2 ** (octave + step / 12);
}

/** Progressão de "acordes" (graus da escala que servem de raiz), quartas/quintas abertas. */
const PROGRESSION = [0, 4, 1, 3, 0, 2, 4, 3];

interface MoodParams {
  readonly bpm: number;
  /** Probabilidade de cada tempo ter nota da melodia. */
  readonly density: number;
  readonly melodyGain: number;
  readonly padGain: number;
  readonly chimeChance: number;
}

const MOODS: Readonly<Record<MusicMood, MoodParams>> = {
  menu: { bpm: 64, density: 0.62, melodyGain: 0.3, padGain: 0.07, chimeChance: 0.12 },
  table: { bpm: 54, density: 0.32, melodyGain: 0.22, padGain: 0.055, chimeChance: 0.06 },
};

/** Gera a melodia de um compasso (4 tempos, colcheias): passeio pela escala com respiros. */
export function phrase(
  prev: number,
  density: number,
  rand: () => number,
): { beat: number; degree: number; long: boolean }[] {
  const notes: { beat: number; degree: number; long: boolean }[] = [];
  let degree = prev;
  for (let eighth = 0; eighth < 8; eighth++) {
    const onBeat = eighth % 2 === 0;
    if (rand() > (onBeat ? density : density * 0.35)) continue;
    const r = rand();
    const step = r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.85 ? 2 : -2;
    degree = Math.max(3, Math.min(12, degree + step));
    notes.push({ beat: eighth / 2, degree, long: onBeat && rand() < 0.3 });
  }
  return notes;
}

class AmbientMusic {
  private out: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBar = 0;
  private bar = 0;
  private lastDegree = 7;
  private mood: MusicMood = 'menu';
  private volume = 0.5;

  start(mood: MusicMood): void {
    this.mood = mood;
    const g = audioGraph();
    if (!g) return;
    if (!this.out) {
      this.out = g.ctx.createGain();
      this.out.gain.value = 0;
      this.out.connect(g.input);
      this.out.connect(g.reverb);
    }
    this.out.gain.cancelScheduledValues(g.ctx.currentTime);
    this.out.gain.setTargetAtTime(this.volume, g.ctx.currentTime, 1.2);
    if (this.timer) return;
    this.nextBar = g.ctx.currentTime + 0.2;
    // Agenda com antecedência (padrão "lookahead"): a cada 250 ms, garante o próximo compasso.
    this.timer = globalThis.setInterval(() => this.schedule(), 250);
    this.schedule();
  }

  setMood(mood: MusicMood): void {
    this.mood = mood;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    const g = audioGraph();
    if (g && this.out && this.timer)
      this.out.gain.setTargetAtTime(this.volume, g.ctx.currentTime, 0.4);
  }

  stop(): void {
    const g = audioGraph();
    if (g && this.out) this.out.gain.setTargetAtTime(0, g.ctx.currentTime, 0.6);
    if (this.timer) globalThis.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const g = audioGraph();
    if (!g || !this.out) return;
    const ctx = g.ctx;
    const p = MOODS[this.mood];
    const beat = 60 / p.bpm;
    while (this.nextBar < ctx.currentTime + 1.5) {
      const t0 = this.nextBar;
      const root = PROGRESSION[Math.floor(this.bar / 2) % PROGRESSION.length] ?? 0;
      if (this.bar % 2 === 0) this.pad(t0, root, beat * 8, p.padGain);
      this.bass(t0, root, beat * 3);
      // Melodia: compassos com frase alternam com respiros, como um intérprete pensando.
      if (this.bar % 4 !== 3) {
        for (const n of phrase(this.lastDegree, p.density, Math.random)) {
          this.guzheng(
            t0 + n.beat * beat,
            degreeToFreq(n.degree),
            n.long ? beat * 3 : beat * 1.6,
            p.melodyGain,
          );
          this.lastDegree = n.degree;
        }
      }
      if (Math.random() < p.chimeChance)
        this.chimes(t0 + beat * (1 + Math.floor(Math.random() * 3)));
      this.nextBar += beat * 4;
      this.bar += 1;
    }
  }

  /** Corda dedilhada: parciais com decaimento próprio + leve deslize de afinação no ataque. */
  private guzheng(t: number, freq: number, dur: number, gain: number): void {
    const g = audioGraph();
    if (!g || !this.out) return;
    const ctx = g.ctx;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    env.connect(this.out);
    const partials = [1, 2, 3, 4, 5.02];
    partials.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      const pg = ctx.createGain();
      osc.type = 'sine';
      // Deslize típico do guzheng: a nota começa um pouco abaixo e sobe.
      osc.frequency.setValueAtTime(freq * ratio * 0.985, t);
      osc.frequency.exponentialRampToValueAtTime(freq * ratio, t + 0.07);
      pg.gain.setValueAtTime(1 / (1 + i * 1.6), t);
      pg.gain.exponentialRampToValueAtTime(0.001, t + dur / (1 + i * 0.9));
      osc.connect(pg).connect(env);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  /** Colchão: quinta aberta com dois osciladores levemente desafinados e filtro que respira. */
  private pad(t: number, root: number, dur: number, gain: number): void {
    const g = audioGraph();
    if (!g || !this.out) return;
    const ctx = g.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(1100, t + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(500, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + dur * 0.35);
    env.gain.linearRampToValueAtTime(0, t + dur);
    filter.connect(env).connect(this.out);
    for (const degree of [root, root + 3]) {
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = degreeToFreq(degree, D3 / 2);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + dur + 0.1);
      }
    }
  }

  private bass(t: number, root: number, dur: number): void {
    const g = audioGraph();
    if (!g || !this.out) return;
    const ctx = g.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = degreeToFreq(root, D3 / 4);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.08, t + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env).connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Sinos de vento: três notas agudas rápidas, com parciais de sino. */
  private chimes(t: number): void {
    const g = audioGraph();
    if (!g || !this.out) return;
    const ctx = g.ctx;
    for (let k = 0; k < 3; k++) {
      const start = t + k * (0.09 + Math.random() * 0.08);
      const f = degreeToFreq(15 + Math.floor(Math.random() * 5));
      for (const [ratio, amp] of [
        [1, 0.05],
        [2.76, 0.02],
        [5.4, 0.01],
      ] as const) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.frequency.value = f * ratio;
        env.gain.setValueAtTime(amp, start);
        env.gain.exponentialRampToValueAtTime(0.0005, start + 2.2 / ratio);
        osc.connect(env).connect(this.out);
        osc.start(start);
        osc.stop(start + 2.4);
      }
    }
  }
}

export const music = new AmbientMusic();
