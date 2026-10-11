/**
 * PRNG com semente (spec 5.5): sfc32, com a semente de 32 bits expandida por splitmix32.
 * Determinístico: mesma semente ⇒ mesma sequência. Sem `Math.random`.
 */

export interface Rng {
  /** Número em [0, 1). */
  next(): number;
  /** Inteiro uniforme em [0, maxExclusive). */
  int(maxExclusive: number): number;
}

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export function createRng(seed: number): Rng {
  const init = splitmix32(seed);
  let a = init();
  let b = init();
  let c = init();
  let d = init();

  const nextUint32 = (): number => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t;
  };

  // Descarta as primeiras saídas para misturar bem o estado inicial.
  for (let i = 0; i < 12; i++) nextUint32();

  return {
    next: () => nextUint32() / 4294967296,
    int(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError(`int(): limite inválido ${maxExclusive}`);
      }
      // Rejeição para evitar viés de módulo.
      const limit = 4294967296 - (4294967296 % maxExclusive);
      let x = nextUint32();
      while (x >= limit) x = nextUint32();
      return x % maxExclusive;
    },
  };
}

/** Embaralhamento Fisher-Yates, sem viés (retorna uma cópia). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}
