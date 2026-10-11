/**
 * Decomposição de mãos completas (todas as leituras possíveis, spec 7.9) e esperas.
 */
import { KIND_COUNT, YAOCHU_KINDS, type TileKind } from '../tiles';
import { chiitoitsuShanten, kokushiShanten } from './shanten';

/** Grupo fechado da mão: sequência (começando em `kind`) ou trinca. */
export type HandSet = { readonly type: 'seq' | 'trip'; readonly kind: TileKind };

/** Leitura padrão: par + grupos formados pelas peças fechadas (as chamadas ficam de fora). */
export type RegularDecomposition = {
  readonly form: 'regular';
  readonly pair: TileKind;
  readonly sets: readonly HandSet[];
};
export type ChiitoitsuDecomposition = { readonly form: 'chiitoitsu'; readonly pairs: TileKind[] };
export type KokushiDecomposition = { readonly form: 'kokushi'; readonly pair: TileKind };
export type Decomposition = RegularDecomposition | ChiitoitsuDecomposition | KokushiDecomposition;

function decomposeSets(c: number[], start: number, acc: HandSet[], out: HandSet[][]): void {
  let i = start;
  while (i < KIND_COUNT && c[i] === 0) i++;
  if (i >= KIND_COUNT) {
    out.push([...acc]);
    return;
  }
  const ci = c[i] as number;
  if (ci >= 3) {
    c[i] = ci - 3;
    acc.push({ type: 'trip', kind: i });
    decomposeSets(c, i, acc, out);
    acc.pop();
    c[i] = ci;
  }
  if (i < 27 && i % 9 <= 6 && (c[i + 1] as number) > 0 && (c[i + 2] as number) > 0) {
    c[i] = ci - 1;
    c[i + 1] = (c[i + 1] as number) - 1;
    c[i + 2] = (c[i + 2] as number) - 1;
    acc.push({ type: 'seq', kind: i });
    decomposeSets(c, i, acc, out);
    acc.pop();
    c[i] = ci;
    c[i + 1] = (c[i + 1] as number) + 1;
    c[i + 2] = (c[i + 2] as number) + 1;
  }
}

/** Todas as leituras padrão (par + grupos) de uma mão completa (3n+2 peças). */
export function regularDecompositions(counts: readonly number[]): RegularDecomposition[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total % 3 !== 2) return [];
  const c = counts.slice();
  const result: RegularDecomposition[] = [];
  for (let pair = 0; pair < KIND_COUNT; pair++) {
    if ((c[pair] as number) < 2) continue;
    c[pair] = (c[pair] as number) - 2;
    const setsList: HandSet[][] = [];
    decomposeSets(c, 0, [], setsList);
    for (const sets of setsList) result.push({ form: 'regular', pair, sets });
    c[pair] = (c[pair] as number) + 2;
  }
  return result;
}

export function isChiitoitsu(counts: readonly number[]): boolean {
  return counts.reduce((a, b) => a + b, 0) === 14 && chiitoitsuShanten(counts) === -1;
}

export function isKokushi(counts: readonly number[]): boolean {
  return counts.reduce((a, b) => a + b, 0) === 14 && kokushiShanten(counts) === -1;
}

/** Todas as leituras de uma mão completa. `meldCount` > 0 exclui chiitoitsu e kokushi. */
export function decompositions(counts: readonly number[], meldCount = 0): Decomposition[] {
  const out: Decomposition[] = [...regularDecompositions(counts)];
  if (meldCount === 0) {
    if (isChiitoitsu(counts)) {
      out.push({
        form: 'chiitoitsu',
        pairs: counts.flatMap((c, k) => (c === 2 ? [k] : [])),
      });
    }
    if (isKokushi(counts)) {
      const pair = YAOCHU_KINDS.find((k) => counts[k] === 2) as TileKind;
      out.push({ form: 'kokushi', pair });
    }
  }
  return out;
}

/**
 * As peças formam só grupos (trincas/sequências)? Guloso e O(34): para a menor peça, usar trinca
 * quando há 3+ cópias nunca atrapalha (três sequências iguais equivalem a três trincas).
 */
function allSets(c: number[]): boolean {
  for (let i = 0; i < KIND_COUNT; i++) {
    let ci = c[i] as number;
    if (ci === 0) continue;
    if (ci >= 3) ci -= 3;
    if (ci === 0) continue;
    if (i >= 27 || i % 9 > 6) return false;
    const c1 = c[i + 1] as number;
    const c2 = c[i + 2] as number;
    if (c1 < ci || c2 < ci) return false;
    c[i + 1] = c1 - ci;
    c[i + 2] = c2 - ci;
  }
  return true;
}

/** Forma padrão completa (par + grupos), sem enumerar leituras. */
export function isRegularAgari(counts: readonly number[]): boolean {
  let total = 0;
  for (const c of counts) total += c;
  if (total % 3 !== 2) return false;
  for (let pair = 0; pair < KIND_COUNT; pair++) {
    if ((counts[pair] as number) < 2) continue;
    const c = counts.slice();
    c[pair] = (c[pair] as number) - 2;
    if (allSets(c)) return true;
  }
  return false;
}

/** Mão completa (forma), sem considerar yaku. */
export function isAgari(counts: readonly number[], meldCount = 0): boolean {
  if (isRegularAgari(counts)) return true;
  return meldCount === 0 && (isChiitoitsu(counts) || isKokushi(counts));
}

/**
 * Esperas de uma mão de 3n+1 peças: tipos que completam a mão. Exclui tipos dos quais a própria mão
 * já tem as 4 cópias (impossíveis de receber). Espera sem cópias restantes fora da mão (karaten)
 * continua sendo espera.
 */
export function waits(
  counts: readonly number[],
  meldCount = 0,
  kinds?: readonly TileKind[],
): TileKind[] {
  const c = counts.slice();
  const out: TileKind[] = [];
  const candidates = kinds ?? Array.from({ length: KIND_COUNT }, (_, k) => k);
  for (const k of candidates) {
    if ((c[k] as number) >= 4) continue;
    c[k] = (c[k] as number) + 1;
    if (isAgari(c, meldCount)) out.push(k);
    c[k] = (c[k] as number) - 1;
  }
  return out;
}

/** Tenpai de forma (não exige yaku). */
export function isTenpai(counts: readonly number[], meldCount = 0): boolean {
  return waits(counts, meldCount).length > 0;
}
