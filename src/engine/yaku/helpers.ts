/** Funções auxiliares compartilhadas por vários yaku e pelo cálculo de fu. */
import { isDragon, isTerminal, isYaochu, type TileKind } from '../tiles';
import { groupKinds, type YakuContext, type WinSituation } from './context';

/** Par com valor: dragão, vento do assento ou vento da rodada. */
export const isValuedPair = (pair: TileKind, win: WinSituation): boolean =>
  isDragon(pair) || pair === win.seatWind || pair === win.roundWind;

/** Quantos pares de sequências idênticas existem (1 = iipeikou, 2 = ryanpeikou). */
export function identicalSequencePairs(ctx: YakuContext): number {
  if (ctx.form !== 'regular') return 0;
  const counts = new Map<TileKind, number>();
  for (const g of ctx.groups) {
    if (g.type === 'seq') counts.set(g.kind, (counts.get(g.kind) ?? 0) + 1);
  }
  let pairs = 0;
  for (const c of counts.values()) pairs += Math.floor(c / 2);
  return pairs;
}

/** Todo grupo e o par contêm ao menos uma peça terminal/honra (`yaochu`) ou terminal. */
export function allGroupsTouch(ctx: YakuContext, what: 'yaochu' | 'terminal'): boolean {
  if (ctx.form !== 'regular' || ctx.pair === null) return false;
  const test = what === 'yaochu' ? isYaochu : isTerminal;
  return test(ctx.pair) && ctx.groups.every((g) => groupKinds(g).some(test));
}

/** Trincas/quadras fechadas (ankou), sem contar a trinca completada por ron. */
export const concealedTriplets = (ctx: YakuContext): number =>
  ctx.groups.filter((g) => g.type !== 'seq' && g.concealed).length;
