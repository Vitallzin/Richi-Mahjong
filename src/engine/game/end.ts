/**
 * Fim de mão (vitória, exaustão, abortivo) e fim de partida (spec 7.11 e 7.12).
 */
import { isTenpai } from '../hand';
import { nagashiPayments, notenPayments, winPayments, YAKUMAN_BASE } from '../scoring';
import { isYaochu, toCounts, type Tile } from '../tiles';
import type { Seat } from '../types';
import { PAO_YAKU } from '../yaku';
import type {
  AbortiveReason,
  GameEvent,
  HandSummary,
  MatchResult,
  MatchState,
  WinRecord,
} from './types';
import {
  allSeats,
  handNumber,
  playerCount,
  playerOf,
  requireHand,
  revealedDora,
  roundWindKind,
} from './util';

export interface WinCandidate {
  readonly seat: Seat;
  readonly from: Seat | null;
  readonly winTile: Tile;
  readonly concealed: readonly Tile[];
  readonly scored: WinRecord['scored'];
}

/** Classificação: mais pontos primeiro; empate pela prioridade de assento (0 > 1 > 2 > 3). */
export function rankSeats(scores: readonly number[]): Seat[] {
  return allSeats(scores.length).sort(
    (a, b) => (scores[b] as number) - (scores[a] as number) || a - b,
  );
}

const sumDeltas = (a: number[], b: readonly number[]) => a.map((v, i) => v + (b[i] ?? 0));

interface HandEnd {
  readonly kind: HandSummary['kind'];
  readonly deltas: readonly number[];
  readonly renchan: boolean;
  readonly dealerWon: boolean;
  readonly wins: readonly WinRecord[];
  readonly abortiveReason: AbortiveReason | null;
  readonly tenpai: readonly boolean[] | null;
  readonly revealed: Partial<Record<Seat, readonly Tile[]>>;
  readonly nagashi: readonly Seat[];
  readonly showUra: boolean;
}

/** Última mão prevista e vento máximo de extensão (spec 6.2: Leste→Sul; Leste-Sul→Oeste). */
function windLimits(s: MatchState): { lastWind: number; maxWind: number } {
  switch (s.rules.length) {
    case 'oneHand':
      return { lastWind: 0, maxWind: 0 };
    case 'east':
      return { lastWind: 0, maxWind: 1 };
    case 'south':
      return { lastWind: 1, maxWind: 2 };
  }
}

function decideMatchEnd(
  s: MatchState,
  prev: { roundWind: number; dealer: Seat },
  end: HandEnd,
): MatchResult['endReason'] | null {
  const n = playerCount(s);
  const { lastWind, maxWind } = windLimits(s);
  const target = s.rules.targetPoints;
  const top = Math.max(...s.scores);

  if (s.rules.tobi && s.scores.some((p) => p < 0)) return 'tobi';
  if (s.rules.length === 'oneHand') return 'normal';

  const wasAllLast = prev.roundWind === lastWind && prev.dealer === n - 1;
  const inExtension = prev.roundWind > lastWind;
  const dealerIsFirst = rankSeats(s.scores)[0] === prev.dealer;

  if (
    s.rules.agariYame &&
    (wasAllLast || inExtension) &&
    end.dealerWon &&
    dealerIsFirst &&
    (s.scores[prev.dealer] as number) >= target
  ) {
    return 'agariYame';
  }
  if ((inExtension || (wasAllLast && !end.renchan)) && top >= target) return 'normal';
  if (s.roundWind > maxWind) return 'normal';
  return null;
}

function finalResult(s: MatchState, endReason: MatchResult['endReason']): MatchResult {
  const scores = s.scores.slice();
  const ranking = rankSeats(scores);
  const first = ranking[0] as Seat;
  // Bastões de riichi que sobraram vão para o 1º colocado.
  scores[first] = (scores[first] as number) + s.riichiSticks * 1000;
  return { ranking, finalScores: scores, endReason };
}

/** Aplica o fim da mão: pontos, honba, dealer, vento, resumo e possível fim de partida. */
function finishHand(s: MatchState, end: HandEnd): void {
  const h = requireHand(s);
  const n = playerCount(s);
  const scoresBefore = s.scores.slice();
  s.scores = sumDeltas(s.scores, end.deltas);
  const prev = { roundWind: s.roundWind, dealer: s.dealer };
  const summaryBase = {
    roundWind: roundWindKind(s),
    handNumber: handNumber(s),
    honba: s.honba,
  };

  if (end.kind === 'win') {
    s.riichiSticks = 0;
    s.honba = end.renchan ? s.honba + 1 : 0;
  } else {
    s.honba += 1;
  }
  if (!end.renchan) {
    s.dealer = ((s.dealer + 1) % n) as Seat;
    if (s.dealer === 0) s.roundWind += 1;
  }

  const endReason = decideMatchEnd(s, prev, end);
  const summary: HandSummary = {
    kind: end.kind,
    ...summaryBase,
    wins: end.wins,
    abortiveReason: end.abortiveReason,
    tenpai: end.tenpai,
    revealed: end.revealed,
    nagashi: end.nagashi,
    doraIndicators: revealedDora(h),
    uraIndicators: end.showUra ? h.uraIndicators.slice(0, h.doraRevealed) : [],
    deltas: end.deltas,
    scoresBefore,
    scoresAfter: s.scores.slice(),
    renchan: end.renchan,
    matchEnds: endReason !== null,
  };
  s.summary = summary;
  s.result = endReason ? finalResult(s, endReason) : null;
  s.phase = 'handSummary';
  s.acks = allSeats(n).map(() => false);
  s.handsPlayed += 1;
  h.pendingCalls = null;
  h.pendingRobbery = null;
}

/** Pontuação e pagamentos de uma ou mais vitórias (ron múltiplo com atamahane). */
export function endWithWins(
  s: MatchState,
  candidates: readonly WinCandidate[],
  events: GameEvent[],
): void {
  const h = requireHand(s);
  const n = playerCount(s);
  let deltas = new Array<number>(n).fill(0);
  const wins: WinRecord[] = [];
  const revealed: Partial<Record<Seat, readonly Tile[]>> = {};
  candidates.forEach((c, index) => {
    const p = playerOf(h, c.seat);
    const first = index === 0; // o mais próximo do descartador leva honba e bastões
    const paoYaku = c.scored.yakuman.filter((y) => PAO_YAKU.has(y.id));
    let pao: { seat: Seat; base: number } | undefined;
    for (const y of paoYaku) {
      const liable = y.id === 'daisangen' ? p.pao.daisangen : p.pao.daisuushii;
      if (liable !== null && liable !== c.seat)
        pao = { seat: liable, base: YAKUMAN_BASE * y.value };
    }
    const d = winPayments({
      base: c.scored.base,
      winner: c.seat,
      dealer: s.dealer,
      winType: c.from === null ? 'tsumo' : 'ron',
      ...(c.from === null ? {} : { discarder: c.from }),
      honba: first ? s.honba : 0,
      riichiSticks: first ? s.riichiSticks : 0,
      ...(pao ? { pao } : {}),
      rules: s.rules,
    });
    deltas = sumDeltas(deltas, d);
    revealed[c.seat] = c.concealed;
    wins.push({
      seat: c.seat,
      from: c.from,
      winType: c.from === null ? 'tsumo' : 'ron',
      scored: c.scored,
      hand: c.concealed,
      melds: p.melds,
      winTile: c.winTile,
      pao: pao?.seat ?? null,
      deltas: d,
    });
  });
  const dealerWon = candidates.some((c) => c.seat === s.dealer);
  const showUra = candidates.some((c) => playerOf(h, c.seat).riichi?.established);
  events.push({ type: 'HandWon', wins });
  finishHand(s, {
    kind: 'win',
    deltas,
    renchan: dealerWon,
    dealerWon,
    wins,
    abortiveReason: null,
    tenpai: null,
    revealed,
    nagashi: [],
    showUra,
  });
}

/** Empate por exaustão: nagashi mangan ou pagamento de noten (spec 7.11). */
export function endExhaustive(s: MatchState, events: GameEvent[]): void {
  const h = requireHand(s);
  const n = playerCount(s);
  const tenpai = h.players.map((p) => isTenpai(toCounts(p.hand), p.melds.length));
  const nagashi = s.rules.nagashiMangan
    ? allSeats(n).filter((seat) => {
        const p = playerOf(h, seat);
        return (
          p.discards.length > 0 &&
          p.discards.every((d) => isYaochu(d.tile.kind) && d.calledBy === null)
        );
      })
    : [];
  let deltas = new Array<number>(n).fill(0);
  if (nagashi.length > 0) {
    for (const seat of nagashi)
      deltas = sumDeltas(deltas, nagashiPayments(seat, s.dealer, s.rules));
  } else {
    deltas = notenPayments(tenpai, s.rules);
  }
  const revealed: Partial<Record<Seat, readonly Tile[]>> = {};
  tenpai.forEach((t, seat) => {
    if (t) revealed[seat as Seat] = playerOf(h, seat as Seat).hand.slice();
  });
  events.push({ type: 'ExhaustiveDraw', tenpai, nagashi });
  finishHand(s, {
    kind: 'exhaustive',
    deltas,
    renchan: tenpai[s.dealer] ?? false,
    dealerWon: false,
    wins: [],
    abortiveReason: null,
    tenpai,
    revealed,
    nagashi,
    showUra: false,
  });
}

/** Empate abortivo: honba +1, dealer repete, bastões ficam na mesa. */
export function endAbortive(
  s: MatchState,
  reason: AbortiveReason,
  events: GameEvent[],
  revealSeat?: Seat,
): void {
  const h = requireHand(s);
  const revealed: Partial<Record<Seat, readonly Tile[]>> = {};
  if (revealSeat !== undefined) revealed[revealSeat] = playerOf(h, revealSeat).hand.slice();
  events.push({ type: 'AbortiveDraw', reason });
  finishHand(s, {
    kind: 'abortive',
    deltas: new Array<number>(playerCount(s)).fill(0),
    renchan: true,
    dealerWon: false,
    wins: [],
    abortiveReason: reason,
    tenpai: null,
    revealed,
    nagashi: [],
    showUra: false,
  });
}
