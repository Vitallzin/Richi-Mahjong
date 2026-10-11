/**
 * Partida "montada" para testes de cenário: mãos, ordem de compra e muro morto definidos por notação.
 * As peças não citadas completam o muro vivo (depois das compras definidas) em ordem de id.
 */
import type { MatchState, PlayerState } from '../game/types';
import type { RuleSet } from '../rules';
import { buildTileSet, parseTiles, type Tile } from '../tiles';
import type { Seat } from '../types';

export interface RiggedLayout {
  /** 13 peças por assento (na ordem dos assentos 0..n-1). */
  readonly hands: readonly string[];
  /** Compras do muro vivo, na ordem (a 1ª é a do dealer). */
  readonly draws?: string;
  /** Indicadores de dora (o 1º já começa revelado). */
  readonly dora?: string;
  readonly ura?: string;
  readonly replacements?: string;
  readonly dealer?: Seat;
  readonly roundWind?: number;
  readonly honba?: number;
  readonly riichiSticks?: number;
  readonly scores?: readonly number[];
}

/** Converte notação em peças reais do conjunto (respeitando vermelhas e ids livres). */
function take(notation: string | undefined, pool: Map<number, Tile>): Tile[] {
  if (!notation) return [];
  const wanted = parseTiles(notation);
  return wanted.map((w) => {
    const match = [...pool.values()].find((t) => t.kind === w.kind && t.red === w.red);
    if (!match) throw new Error(`Peça indisponível no conjunto: ${notation}`);
    pool.delete(match.id);
    return match;
  });
}

export function riggedMatch(rules: RuleSet, layout: RiggedLayout): MatchState {
  const n = rules.players;
  const pool = new Map(buildTileSet(rules.mode, rules.akaDora).map((t) => [t.id, t]));
  const hands = layout.hands.map((h) => take(h, pool));
  hands.forEach((h, i) => {
    if (h.length !== 13) throw new Error(`Mão ${i} com ${h.length} peças`);
  });
  const draws = take(layout.draws, pool);
  const dora = take(layout.dora, pool);
  const ura = take(layout.ura, pool);
  const replacements = take(layout.replacements, pool);
  const rest = [...pool.values()].sort((a, b) => a.id - b.id);
  const fill = (arr: Tile[], size: number) => {
    while (arr.length < size) arr.push(rest.pop() as Tile);
  };
  fill(dora, 5);
  fill(ura, 5);
  fill(replacements, 4);
  const wall = [...draws, ...rest];
  const dealer = layout.dealer ?? 0;
  const players: PlayerState[] = hands.map((hand) => ({
    hand,
    drawn: null,
    melds: [],
    discards: [],
    kita: [],
    riichi: null,
    furiten: { temporary: false, riichi: false },
    pao: { daisangen: null, daisuushii: null },
  }));
  const state: MatchState = {
    schemaVersion: 1,
    rules,
    scores: layout.scores
      ? [...layout.scores]
      : Array.from({ length: n }, () => rules.startingPoints),
    roundWind: layout.roundWind ?? 0,
    dealer,
    honba: layout.honba ?? 0,
    riichiSticks: layout.riichiSticks ?? 0,
    phase: 'awaitingDiscard',
    hand: {
      seed: 0,
      wall,
      replacements,
      doraIndicators: dora,
      uraIndicators: ura,
      doraRevealed: 1,
      pendingDora: 0,
      players,
      turn: dealer,
      turnKind: 'draw',
      forbiddenDiscards: [],
      uninterrupted: true,
      kanSeats: [],
      suukaikanPending: false,
      pendingCalls: null,
      pendingRobbery: null,
    },
    summary: null,
    acks: Array.from({ length: n }, () => false),
    handsPlayed: 0,
    result: null,
  };
  const first = wall.shift();
  if (!first) throw new Error('Muro vazio');
  const p = players[dealer] as PlayerState;
  p.hand.push(first);
  p.drawn = first;
  return state;
}
