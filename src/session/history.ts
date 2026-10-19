/**
 * Histórico (spec 12.4): registro das vitórias durante a partida, resumo final do ponto de vista de um
 * jogador e estatísticas da tela de histórico. Tudo puro (sem Firebase), para testar e reaproveitar
 * em partida solo e em sala.
 */
import type { GameEvent, MatchResult, PlayerEvent, RuleSet, Seat } from '../engine';
import type { SeatSetup } from './types';

/** Uma vitória registrada durante a partida (de qualquer jogador). */
export interface LoggedWin {
  readonly seat: Seat;
  /** Ex.: "E1", "S3" (vento da rodada + número da mão). */
  readonly round: string;
  readonly type: 'ron' | 'tsumo';
  readonly yaku: readonly string[];
  readonly han: number;
  readonly fu: number;
  /** Pontos ganhos pelo vencedor na mão (com honba e bastões). */
  readonly points: number;
}

const WIND_LETTER = ['E', 'S', 'W', 'N'] as const;

export interface RoundLabel {
  readonly roundWind: number;
  readonly handNumber: number;
}

/** Vitórias contidas nos eventos de uma atualização (HandWon é público: vale para qualquer sessão). */
export function winsFromEvents(
  events: readonly (GameEvent | PlayerEvent)[],
  round: RoundLabel,
): LoggedWin[] {
  const out: LoggedWin[] = [];
  for (const e of events) {
    if (e.type !== 'HandWon') continue;
    for (const w of e.wins) {
      out.push({
        seat: w.seat,
        round: `${WIND_LETTER[round.roundWind] ?? 'E'}${round.handNumber}`,
        type: w.winType,
        yaku: [...w.scored.yakuman, ...w.scored.yaku].map((y) => y.id),
        han: w.scored.han,
        fu: w.scored.fu,
        points: Math.max(0, w.deltas[w.seat] ?? 0),
      });
    }
  }
  return out;
}

export type MatchLength = 'oneHand' | 'east' | 'south';
export type EndReason = 'normal' | 'tobi' | 'agariYame' | 'abandoned';

export interface MatchSummary {
  readonly id: string;
  readonly endedAt: number;
  readonly source: 'solo' | 'room';
  readonly mode: 'yonma' | 'sanma';
  readonly length: MatchLength;
  readonly rules: {
    readonly startingPoints: number;
    readonly targetPoints: number;
    readonly tobi: boolean;
    readonly akaDora: number;
    readonly kuitan: boolean;
    readonly hanMinimum: number;
    readonly kiriageMangan: boolean;
  };
  readonly training: boolean;
  readonly placement: number;
  readonly finalPoints: number;
  readonly players: readonly {
    readonly seat: number;
    readonly name: string;
    readonly points: number;
    readonly isBot: boolean;
    readonly characterId?: string;
  }[];
  readonly wins: readonly Omit<LoggedWin, 'seat'>[];
  readonly endReason: EndReason;
}

export interface SummaryInput {
  readonly id: string;
  readonly endedAt: number;
  readonly source: 'solo' | 'room';
  readonly rules: RuleSet;
  readonly training: boolean;
  readonly result: MatchResult;
  readonly seats: readonly SeatSetup[];
  readonly names: readonly string[];
  readonly localSeat: Seat;
  readonly wins: readonly LoggedWin[];
}

export function summarizeMatch(input: SummaryInput): MatchSummary {
  const { rules, result, localSeat } = input;
  const endReason: EndReason =
    result.endReason === 'tobi' || result.endReason === 'agariYame' ? result.endReason : 'normal';
  return {
    id: input.id,
    endedAt: input.endedAt,
    source: input.source,
    mode: rules.mode,
    length: rules.length,
    rules: {
      startingPoints: rules.startingPoints,
      targetPoints: rules.targetPoints,
      tobi: rules.tobi,
      akaDora: rules.akaDora,
      kuitan: rules.kuitan,
      hanMinimum: rules.hanMinimum,
      kiriageMangan: rules.kiriageMangan,
    },
    training: input.training,
    placement: result.ranking.indexOf(localSeat) + 1,
    finalPoints: result.finalScores[localSeat] ?? 0,
    players: input.seats.map((s, seat) => ({
      seat,
      name: input.names[seat] ?? '?',
      points: result.finalScores[seat] ?? 0,
      isBot: s.kind === 'bot',
      ...(s.kind === 'bot' ? { characterId: s.characterId } : {}),
    })),
    wins: input.wins.filter((w) => w.seat === localSeat).map(({ seat: _seat, ...rest }) => rest),
    endReason,
  };
}

export interface HistoryStats {
  readonly games: number;
  readonly averagePlacement: number | null;
  readonly firstRate: number | null;
  readonly biggestWin: Omit<LoggedWin, 'seat'> | null;
  /** Yaku mais frequentes nas suas vitórias (até 5), do mais comum ao menos. */
  readonly topYaku: readonly { readonly id: string; readonly count: number }[];
}

/** Estatísticas da tela de histórico; partidas de treino ficam de fora (spec 9.7). */
export function historyStats(list: readonly MatchSummary[]): HistoryStats {
  const counted = list.filter((m) => !m.training);
  const games = counted.length;
  const yakuCount = new Map<string, number>();
  let biggest: Omit<LoggedWin, 'seat'> | null = null;
  for (const m of counted) {
    for (const w of m.wins) {
      if (!biggest || w.points > biggest.points) biggest = w;
      for (const y of w.yaku) yakuCount.set(y, (yakuCount.get(y) ?? 0) + 1);
    }
  }
  const sum = counted.reduce((acc, m) => acc + m.placement, 0);
  return {
    games,
    averagePlacement: games > 0 ? sum / games : null,
    firstRate: games > 0 ? counted.filter((m) => m.placement === 1).length / games : null,
    biggestWin: biggest,
    topYaku: [...yakuCount.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([id, count]) => ({ id, count })),
  };
}

/** Limite do histórico guardado por jogador (spec 12.4). */
export const HISTORY_LIMIT = 100;

/** Ids a apagar para ficar dentro do limite, mantendo as mais recentes. */
export function idsToPrune(list: readonly Pick<MatchSummary, 'id' | 'endedAt'>[]): string[] {
  if (list.length <= HISTORY_LIMIT) return [];
  return [...list]
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(HISTORY_LIMIT)
    .map((m) => m.id);
}

const asArray = <T>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : v && typeof v === 'object' ? (Object.values(v) as T[]) : [];

/**
 * Resumo lido do banco: o Realtime Database não guarda listas vazias e pode devolver listas como
 * objetos. Completa os campos; descarta o que não tem o mínimo exigido pelas regras.
 */
export function normalizeSummary(raw: unknown): MatchSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<MatchSummary>;
  if (typeof r.endedAt !== 'number' || typeof r.placement !== 'number') return null;
  return {
    ...(r as MatchSummary),
    training: r.training === true,
    players: asArray(r.players),
    wins: asArray<Omit<LoggedWin, 'seat'>>(r.wins).map((w) => ({ ...w, yaku: asArray(w.yaku) })),
  };
}
