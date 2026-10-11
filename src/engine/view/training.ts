/**
 * Visão do modo treino "Mostrar mãos" (spec 9.7). ÚNICA exceção à redação de informação oculta:
 * usada só pela LocalSession em partida solo, só para a apresentação. Nunca entregue a bots,
 * ajudas ou convidados (imposto por lint em src/help e src/bots).
 */
import type { MatchState } from '../game/types';
import { allSeats, playerOf } from '../game/util';
import type { Tile } from '../tiles';
import type { Seat } from '../types';
import { getPlayerView, type PlayerView } from './view';

export interface TrainingView extends PlayerView {
  readonly training: true;
  /** Mãos fechadas de todos os assentos. */
  readonly revealedHands: Readonly<Partial<Record<Seat, readonly Tile[]>>>;
}

export function getTrainingView(s: MatchState, seat: Seat): TrainingView {
  const revealedHands: Partial<Record<Seat, readonly Tile[]>> = {};
  if (s.hand) {
    for (const ps of allSeats(s.rules.players)) {
      revealedHands[ps] = structuredClone(playerOf(s.hand, ps).hand);
    }
  }
  return { ...getPlayerView(s, seat), training: true, revealedHands };
}
