/**
 * Som ao passar o mouse (pedido do desenvolvedor): toques curtos e suaves, afinados na mesma
 * pentatônica da música — "tok" de bambu nos botões e um estalo leve de pedra nas peças.
 * Sintetizados na hora (latência mínima) e com limite de frequência para não virar ruído.
 */
import { audioGraph } from './context';
import { degreeToFreq } from './music';

export type HoverKind = 'button' | 'tile';

let last = 0;
let lastDegree = 10;
let volume = 0.8;

export function setHoverVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
}

export function playHover(kind: HoverKind): void {
  const g = audioGraph();
  if (!g || g.ctx.state !== 'running' || volume === 0) return;
  const ctx = g.ctx;
  const now = ctx.currentTime;
  if (now - last < 0.045) return; // varrer a mão com o mouse soa como um arpejo, não como chiado
  last = now;
  // Passeio na escala: notas vizinhas soam como um arpejo agradável ao varrer vários itens.
  lastDegree = Math.max(8, Math.min(14, lastDegree + (Math.random() < 0.5 ? -1 : 1)));
  const freq = kind === 'tile' ? degreeToFreq(lastDegree - 5) : degreeToFreq(lastDegree);
  const env = ctx.createGain();
  const peak = (kind === 'tile' ? 0.11 : 0.07) * volume;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(peak, now + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0005, now + (kind === 'tile' ? 0.09 : 0.16));
  env.connect(g.input);
  const send = ctx.createGain();
  send.gain.value = 0.25;
  env.connect(send).connect(g.reverb);
  const ratios = kind === 'tile' ? [1, 2.3, 4.1] : [1, 2.01];
  ratios.forEach((r, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * r;
    const pg = ctx.createGain();
    pg.gain.value = 1 / (1 + i * 2);
    osc.connect(pg).connect(env);
    osc.start(now);
    osc.stop(now + 0.2);
  });
}
