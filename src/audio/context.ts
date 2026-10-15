/**
 * Contexto Web Audio compartilhado pela música ambiente e pelos sons de interface: saída com
 * volume próprio e uma reverberação de sala gerada (sem arquivos). Criado só após um gesto do
 * usuário (política de autoplay dos navegadores).
 */

interface AudioGraph {
  readonly ctx: AudioContext;
  /** Entrada "seca" (já passa por um pouco de reverberação). */
  readonly input: GainNode;
  readonly reverb: GainNode;
}

let graph: AudioGraph | null = null;

function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return buf;
}

/** Grafo de áudio (criado na primeira chamada; null se o navegador não suporta Web Audio). */
export function audioGraph(): AudioGraph | null {
  if (graph) return graph;
  const Ctor = globalThis.AudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const out = ctx.createGain();
  out.connect(ctx.destination);
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse(ctx, 3.2, 2.6);
  const reverb = ctx.createGain();
  reverb.gain.value = 1;
  reverb.connect(convolver);
  convolver.connect(out);
  const input = ctx.createGain();
  input.connect(out);
  graph = { ctx, input, reverb };
  return graph;
}

/** Retoma o contexto após um gesto (pointerdown/keydown). */
export async function resumeAudio(): Promise<void> {
  const g = audioGraph();
  if (g && g.ctx.state === 'suspended') await g.ctx.resume().catch(() => undefined);
}
