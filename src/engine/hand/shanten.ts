/**
 * Shanten (quantas peças faltam para tenpai): -1 = mão completa, 0 = tenpai.
 * Formas: padrão (4 grupos + par), chiitoitsu (7 pares distintos) e kokushi (13 órfãos).
 * Entrada sempre como vetor de contagem de 34 posições (só as peças fechadas).
 */
import { KIND_COUNT as KINDS, YAOCHU_KINDS as YAOCHU } from '../tiles';

// Cópias locais: em laços quentes, ler a constante importada pode custar um getter de módulo
// (ex.: no executor de testes), o que deixava o shanten ~14× mais lento.
const KIND_COUNT = KINDS;
const YAOCHU_KINDS = YAOCHU;

/**
 * Shanten da forma padrão. `meldCount` = grupos já chamados/declarados (cada um reduz um grupo).
 * Busca em profundidade sobre trincas, sequências, pares e protogrupos (taatsu).
 */
export function regularShanten(counts: readonly number[], meldCount = 0): number {
  const c = counts.slice();
  const groupsNeeded = 4 - meldCount;
  let best = 2 * groupsNeeded; // nenhum grupo, nenhum par

  const evaluate = (mentsu: number, taatsu: number, pair: boolean) => {
    const usable = Math.min(taatsu, groupsNeeded - mentsu);
    const s = 2 * (groupsNeeded - mentsu) - usable - (pair ? 1 : 0);
    if (s < best) best = s;
  };

  const dfs = (start: number, mentsu: number, taatsu: number, pair: boolean): void => {
    let i = start;
    while (i < KIND_COUNT && c[i] === 0) i++;
    if (i >= KIND_COUNT) {
      evaluate(mentsu, taatsu, pair);
      return;
    }
    // Poda: mesmo usando todo o resto da melhor forma possível, não melhora o resultado.
    if (best === -1) return;

    const ci = c[i] as number;
    const suited = i < 27;
    const n = i % 9; // 0..8
    const c1 = suited && n <= 7 ? (c[i + 1] as number) : 0;
    const c2 = suited && n <= 6 ? (c[i + 2] as number) : 0;

    if (ci >= 3) {
      c[i] = ci - 3;
      dfs(i, mentsu + 1, taatsu, pair);
      c[i] = ci;
    }
    if (c1 > 0 && c2 > 0) {
      c[i] = ci - 1;
      c[i + 1] = c1 - 1;
      c[i + 2] = c2 - 1;
      dfs(i, mentsu + 1, taatsu, pair);
      c[i] = ci;
      c[i + 1] = c1;
      c[i + 2] = c2;
    }
    if (ci >= 2) {
      c[i] = ci - 2;
      if (!pair) dfs(i, mentsu, taatsu, true);
      dfs(i, mentsu, taatsu + 1, pair);
      c[i] = ci;
    }
    if (c1 > 0) {
      c[i] = ci - 1;
      c[i + 1] = c1 - 1;
      dfs(i, mentsu, taatsu + 1, pair);
      c[i] = ci;
      c[i + 1] = c1;
    }
    if (c2 > 0) {
      c[i] = ci - 1;
      c[i + 2] = c2 - 1;
      dfs(i, mentsu, taatsu + 1, pair);
      c[i] = ci;
      c[i + 2] = c2;
    }
    // Peça isolada: descarta uma cópia e segue.
    c[i] = ci - 1;
    dfs(i, mentsu, taatsu, pair);
    c[i] = ci;
  };

  dfs(0, 0, 0, false);
  return best;
}

/** Shanten de chiitoitsu (só mão fechada sem chamadas). */
export function chiitoitsuShanten(counts: readonly number[]): number {
  let pairs = 0;
  let kinds = 0;
  for (const c of counts) {
    if (c > 0) kinds++;
    if (c >= 2) pairs++;
  }
  return 6 - pairs + Math.max(0, 7 - kinds);
}

/** Shanten de kokushi musou (só mão fechada sem chamadas). */
export function kokushiShanten(counts: readonly number[]): number {
  let unique = 0;
  let hasPair = false;
  for (const k of YAOCHU_KINDS) {
    const c = counts[k] as number;
    if (c > 0) unique++;
    if (c >= 2) hasPair = true;
  }
  return 13 - unique - (hasPair ? 1 : 0);
}

/** Menor shanten entre as formas possíveis. Chiitoitsu e kokushi exigem mão sem chamadas. */
export function shanten(counts: readonly number[], meldCount = 0): number {
  const regular = regularShanten(counts, meldCount);
  if (meldCount > 0) return regular;
  return Math.min(regular, chiitoitsuShanten(counts), kokushiShanten(counts));
}
