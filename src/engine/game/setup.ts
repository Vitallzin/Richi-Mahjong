/** Criação da partida e distribuição de cada mão (spec 7.2 e 7.3). */
import { createRng, shuffle } from '../rng';
import type { RuleSet } from '../rules';
import { buildTileSet, type Tile } from '../tiles';
import type { Seat } from '../types';
import { illegal } from './errors';
import type { GameEvent, HandState, MatchState, PlayerState } from './types';
import { allSeats, handNumber, playerCount, roundWindKind } from './util';

/** Tamanho do muro morto (spec 7.2): 4 reposições + 5 indicadores de dora + 5 de ura-dora. */
export const DEAD_WALL_SIZE = 14;
export const REPLACEMENT_POOL = 4;
export const INDICATOR_SLOTS = 5;
export const HAND_SIZE = 13;

const emptyPlayer = (): PlayerState => ({
  hand: [],
  drawn: null,
  melds: [],
  discards: [],
  kita: [],
  riichi: null,
  furiten: { temporary: false, riichi: false },
  pao: { daisangen: null, daisuushii: null },
});

/** Distribui uma nova mão no estado (mutável). A semente fica guardada para reprodução. */
export function dealHand(s: MatchState, seed: number, events: GameEvent[]): void {
  const n = playerCount(s);
  const tiles = shuffle(buildTileSet(s.rules.mode, s.rules.akaDora), createRng(seed));
  const dead = tiles.splice(tiles.length - DEAD_WALL_SIZE, DEAD_WALL_SIZE);
  const players = allSeats(n).map(emptyPlayer);
  // Distribuição a partir do dealer (a ordem física de quatro em quatro não muda a aleatoriedade).
  for (let i = 0; i < n; i++) {
    const seat = ((s.dealer + i) % n) as Seat;
    (players[seat] as PlayerState).hand = tiles.splice(0, HAND_SIZE);
  }
  const hand: HandState = {
    seed: seed >>> 0,
    wall: tiles,
    replacements: dead.slice(0, REPLACEMENT_POOL),
    doraIndicators: dead.slice(REPLACEMENT_POOL, REPLACEMENT_POOL + INDICATOR_SLOTS),
    uraIndicators: dead.slice(REPLACEMENT_POOL + INDICATOR_SLOTS),
    doraRevealed: 1,
    pendingDora: 0,
    players,
    turn: s.dealer,
    turnKind: 'draw',
    forbiddenDiscards: [],
    uninterrupted: true,
    kanSeats: [],
    suukaikanPending: false,
    pendingCalls: null,
    pendingRobbery: null,
  };
  s.hand = hand;
  s.phase = 'awaitingDiscard';
  s.summary = null;
  s.acks = allSeats(n).map(() => false);

  events.push({
    type: 'HandStarted',
    roundWind: roundWindKind(s),
    handNumber: handNumber(s),
    dealer: s.dealer,
    honba: s.honba,
  });
  events.push({ type: 'DoraRevealed', indicator: hand.doraIndicators[0] as Tile });

  const dealer = players[s.dealer] as PlayerState;
  const first = hand.wall.shift() as Tile;
  dealer.hand.push(first);
  dealer.drawn = first;
  events.push({ type: 'TileDrawn', seat: s.dealer, tile: first, rinshan: false });
}

/** Cria a partida e distribui a primeira mão (Leste 1). */
export function createMatch(
  rules: RuleSet,
  seed: number,
): { state: MatchState; events: GameEvent[] } {
  const n = rules.players;
  const state: MatchState = {
    schemaVersion: 1,
    rules,
    scores: allSeats(n).map(() => rules.startingPoints),
    roundWind: 0,
    dealer: 0,
    honba: 0,
    riichiSticks: 0,
    phase: 'awaitingDiscard',
    hand: null,
    summary: null,
    acks: allSeats(n).map(() => false),
    handsPlayed: 0,
    result: null,
  };
  const events: GameEvent[] = [];
  dealHand(state, seed, events);
  return { state, events };
}

/** Todos confirmaram o resumo e a partida continua: a sessão pode distribuir a próxima mão. */
export const canStartNextHand = (s: MatchState): boolean =>
  s.phase === 'handSummary' && s.result === null && s.acks.every(Boolean);

/** Distribui a próxima mão com uma nova semente (gerada pela sessão com crypto.getRandomValues). */
export function startNextHand(
  state: MatchState,
  seed: number,
): { state: MatchState; events: GameEvent[] } {
  if (!canStartNextHand(state)) illegal('notReady', 'A próxima mão ainda não pode começar');
  const s = structuredClone(state);
  const events: GameEvent[] = [];
  dealHand(s, seed, events);
  return { state: s, events };
}
