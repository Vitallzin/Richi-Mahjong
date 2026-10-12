/**
 * Peças visíveis para um jogador (spec 9.3): própria mão, descartes de todos (as chamadas aparecem
 * nos grupos), grupos expostos, indicadores de dora revelados e kita. Usado por ajudas e bots.
 */
import { toCounts, type Tile } from '../tiles';
import type { PlayerView } from './view';

export function visibleCounts(view: PlayerView): number[] {
  const tiles: Tile[] = [...view.hand, ...view.doraIndicators];
  for (const p of view.players) {
    for (const d of p.discards) if (d.calledBy === null) tiles.push(d.tile);
    for (const m of p.melds) tiles.push(...m.tiles);
    tiles.push(...p.kita);
  }
  return toCounts(tiles);
}

/** Cópias de um tipo que o jogador NÃO vê (podem estar no muro ou nas mãos dos outros). */
export const notVisible = (visible: readonly number[], kind: number): number =>
  Math.max(0, 4 - (visible[kind] ?? 0));
