import { PRESET_SANMA, PRESET_YONMA, type GameEvent, type ScoredHand } from '../engine';
import {
  HISTORY_LIMIT,
  historyStats,
  idsToPrune,
  normalizeSummary,
  summarizeMatch,
  winsFromEvents,
  type LoggedWin,
  type MatchSummary,
} from './history';
import type { SeatSetup } from './types';

const scored = (han: number, fu: number, yaku: string[]): ScoredHand =>
  ({
    yaku: yaku.map((id) => ({ id, value: 1 })),
    yakuman: [],
    han,
    fu,
  }) as unknown as ScoredHand;

const SEATS: SeatSetup[] = [
  { kind: 'human', name: 'Você' },
  { kind: 'bot', skill: 'normal', characterId: 'ren' },
  { kind: 'bot', skill: 'normal', characterId: 'akari' },
  { kind: 'bot', skill: 'normal', characterId: 'sora' },
];

describe('histórico (spec 12.4)', () => {
  it('registra vitórias dos eventos HandWon com a rodada e os pontos do vencedor', () => {
    const events = [
      {
        type: 'HandWon',
        wins: [
          {
            seat: 0,
            from: 2,
            winType: 'ron',
            scored: scored(3, 30, ['riichi', 'tanyao']),
            deltas: [4200, 0, -3900, 0],
          },
        ],
      },
    ] as unknown as GameEvent[];
    expect(winsFromEvents(events, { roundWind: 1, handNumber: 3 })).toEqual([
      {
        seat: 0,
        round: 'S3',
        type: 'ron',
        yaku: ['riichi', 'tanyao'],
        han: 3,
        fu: 30,
        points: 4200,
      },
    ]);
  });

  it('resumo do ponto de vista do jogador: colocação, pontos, só as próprias vitórias', () => {
    const wins: LoggedWin[] = [
      { seat: 0, round: 'E1', type: 'tsumo', yaku: ['menzenTsumo'], han: 1, fu: 30, points: 1500 },
      { seat: 2, round: 'E2', type: 'ron', yaku: ['toitoi'], han: 2, fu: 40, points: 2600 },
    ];
    const s = summarizeMatch({
      id: 'abc',
      endedAt: 1000,
      source: 'solo',
      rules: PRESET_YONMA,
      training: false,
      result: {
        ranking: [2, 0, 1, 3],
        finalScores: [26500, 24000, 27600, 21900],
        endReason: 'normal',
      },
      seats: SEATS,
      names: ['Você', 'Ren', 'Akari', 'Sora'],
      localSeat: 0,
      wins,
    });
    expect(s).toMatchObject({ placement: 2, finalPoints: 26500, mode: 'yonma', length: 'south' });
    expect(s.wins).toEqual([
      { round: 'E1', type: 'tsumo', yaku: ['menzenTsumo'], han: 1, fu: 30, points: 1500 },
    ]);
    expect(s.players[1]).toEqual({
      seat: 1,
      name: 'Ren',
      points: 24000,
      isBot: true,
      characterId: 'ren',
    });
    expect(s.rules.startingPoints).toBe(25000);
    const sanma = summarizeMatch({
      id: 'x',
      endedAt: 1,
      source: 'room',
      rules: PRESET_SANMA,
      training: true,
      result: { ranking: [0, 1, 2], finalScores: [50000, 30000, 25000], endReason: 'tobi' },
      seats: SEATS.slice(0, 3),
      names: ['Você', 'Ren', 'Akari'],
      localSeat: 0,
      wins: [],
    });
    expect(sanma).toMatchObject({ mode: 'sanma', placement: 1, endReason: 'tobi', training: true });
  });

  it('estatísticas ignoram treino; maior mão e yaku mais frequentes', () => {
    const base = { training: false, wins: [] } as unknown as MatchSummary;
    const list = [
      {
        ...base,
        placement: 1,
        wins: [
          { round: 'E1', type: 'ron', yaku: ['riichi', 'pinfu'], han: 2, fu: 30, points: 2000 },
        ],
      },
      {
        ...base,
        placement: 3,
        wins: [{ round: 'E2', type: 'tsumo', yaku: ['riichi'], han: 5, fu: 30, points: 8000 }],
      },
      { ...base, placement: 4, training: true },
    ] as MatchSummary[];
    const stats = historyStats(list);
    expect(stats.games).toBe(2);
    expect(stats.averagePlacement).toBe(2);
    expect(stats.firstRate).toBe(0.5);
    expect(stats.biggestWin?.points).toBe(8000);
    expect(stats.topYaku[0]).toEqual({ id: 'riichi', count: 2 });
    expect(historyStats([])).toMatchObject({ games: 0, averagePlacement: null, biggestWin: null });
  });

  it('lido do banco: listas vazias somem e listas viram objetos — o resumo é completado', () => {
    const raw = {
      endedAt: 5,
      placement: 2,
      mode: 'yonma',
      players: { 0: { seat: 0 } },
      wins: { 0: { han: 1 } },
    };
    const m = normalizeSummary(raw)!;
    expect(m.players).toEqual([{ seat: 0 }]);
    expect(m.wins).toEqual([{ han: 1, yaku: [] }]);
    expect(m.training).toBe(false);
    expect(normalizeSummary({ endedAt: 1 })).toBeNull();
    expect(normalizeSummary({ endedAt: 1, placement: 1 })?.wins).toEqual([]);
  });

  it('mantém só as 100 mais recentes', () => {
    const list = Array.from({ length: HISTORY_LIMIT + 3 }, (_, i) => ({ id: `m${i}`, endedAt: i }));
    expect(idsToPrune(list)).toEqual(['m2', 'm1', 'm0']);
    expect(idsToPrune(list.slice(0, 10))).toEqual([]);
  });
});
