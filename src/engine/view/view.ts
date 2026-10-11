/**
 * `PlayerView`: a barreira contra informação oculta (spec 5.3). Contém apenas o que o jogador do
 * assento pode saber. Ajudas e bots só recebem isto, nunca o `MatchState`.
 */
import { getLegalActions, NO_ACTIONS } from '../game/legal';
import type {
  DiscardEntry,
  GameEvent,
  HandSummary,
  LegalActions,
  MatchResult,
  MatchState,
} from '../game/types';
import {
  allSeats,
  isFuriten,
  playerOf,
  revealedDora,
  roundWindKind,
  seatWindKind,
  handNumber,
} from '../game/util';
import type { RuleSet } from '../rules';
import type { Tile, TileKind } from '../tiles';
import type { Meld, Seat } from '../types';

export type ViewPhase =
  | 'awaitingDiscard'
  | 'awaitingCalls'
  | 'awaitingRobbery'
  | 'waiting'
  | 'handSummary'
  | 'matchEnded';

export interface PublicPlayerView {
  readonly seat: Seat;
  readonly seatWind: TileKind;
  readonly score: number;
  readonly isDealer: boolean;
  readonly handCount: number;
  readonly melds: readonly Meld[];
  readonly discards: readonly DiscardEntry[];
  readonly riichi: {
    readonly discardIndex: number;
    readonly double: boolean;
    readonly established: boolean;
  } | null;
  readonly kita: readonly Tile[];
}

export interface PlayerView {
  readonly seat: Seat;
  readonly rules: RuleSet;
  readonly phase: ViewPhase;
  /** Jogador da vez (descarte). Null fora de uma mão em andamento. */
  readonly turn: Seat | null;
  readonly roundWind: TileKind;
  readonly handNumber: number;
  readonly dealer: Seat;
  readonly honba: number;
  readonly riichiSticks: number;
  readonly handsPlayed: number;
  readonly wallRemaining: number;
  readonly doraIndicators: readonly Tile[];
  readonly players: readonly PublicPlayerView[];
  /** Mão do próprio jogador (com a peça comprada). */
  readonly hand: readonly Tile[];
  readonly drawn: Tile | null;
  readonly furiten: boolean;
  readonly legal: LegalActions;
  /** Peça em disputa quando ESTE jogador pode chamar/roubar. */
  readonly callTile: {
    readonly from: Seat;
    readonly tile: Tile;
    readonly kind: 'discard' | 'kakan' | 'ankan' | 'kita';
  } | null;
  readonly summary: HandSummary | null;
  readonly result: MatchResult | null;
}

export function getPlayerView(s: MatchState, seat: Seat): PlayerView {
  const h = s.hand;
  const n = s.rules.players;
  const legal = h ? getLegalActions(s, seat) : NO_ACTIONS;
  const me = h ? playerOf(h, seat) : null;

  let phase: ViewPhase;
  let callTile: PlayerView['callTile'] = null;
  switch (s.phase) {
    case 'awaitingCalls': {
      const pc = h?.pendingCalls;
      const mine = pc && legal.pass;
      phase = mine ? 'awaitingCalls' : 'waiting';
      if (mine && pc) callTile = { from: pc.discarder, tile: pc.tile, kind: 'discard' };
      break;
    }
    case 'awaitingRobbery': {
      const pr = h?.pendingRobbery;
      const mine = pr && legal.pass;
      phase = mine ? 'awaitingRobbery' : 'waiting';
      if (mine && pr) callTile = { from: pr.declarer, tile: pr.tile, kind: pr.kind };
      break;
    }
    default:
      phase = s.phase;
  }

  const players: PublicPlayerView[] = h
    ? allSeats(n).map((ps) => {
        const p = playerOf(h, ps);
        return {
          seat: ps,
          seatWind: seatWindKind(s, ps),
          score: s.scores[ps] as number,
          isDealer: ps === s.dealer,
          handCount: p.hand.length,
          melds: p.melds,
          discards: p.discards,
          riichi: p.riichi
            ? {
                discardIndex: p.riichi.discardIndex,
                double: p.riichi.double,
                established: p.riichi.established,
              }
            : null,
          kita: p.kita,
        };
      })
    : [];

  return structuredClone({
    seat,
    rules: s.rules,
    phase,
    turn: h && s.phase === 'awaitingDiscard' ? h.turn : null,
    roundWind: roundWindKind(s),
    handNumber: handNumber(s),
    dealer: s.dealer,
    honba: s.honba,
    riichiSticks: s.riichiSticks,
    handsPlayed: s.handsPlayed,
    wallRemaining: h ? h.wall.length : 0,
    doraIndicators: h ? revealedDora(h) : [],
    players,
    hand: me ? me.hand : [],
    drawn: me ? me.drawn : null,
    furiten: me ? isFuriten(me) : false,
    legal,
    callTile,
    summary: s.summary,
    result: s.result,
  });
}

/** Evento como visto por um assento: a peça comprada pelos outros fica oculta. */
export type PlayerEvent =
  | Exclude<GameEvent, { type: 'TileDrawn' }>
  | {
      readonly type: 'TileDrawn';
      readonly seat: Seat;
      readonly tile: Tile | null;
      readonly rinshan: boolean;
    };

export function eventsForSeat(events: readonly GameEvent[], seat: Seat): PlayerEvent[] {
  return events.map((e) => (e.type === 'TileDrawn' && e.seat !== seat ? { ...e, tile: null } : e));
}
