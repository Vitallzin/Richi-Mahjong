// Bots jogando partidas inteiras só com PlayerView (spec 8.1 e aceite da Fase 2).
import { createBot, type BotPolicy, type CharacterId } from '../src/bots';
import {
  applyAction,
  canStartNextHand,
  createMatch,
  createRng,
  getLegalActions,
  getPlayerView,
  hasAnyAction,
  PRESET_YONMA,
  rankSeats,
  startNextHand,
  type MatchState,
  type Seat,
} from '../src/engine';

vi.setConfig({ testTimeout: 180_000 });

interface Result {
  readonly state: MatchState;
  readonly maxDecisionMs: number;
  readonly decisions: number;
}

function playMatch(bots: readonly BotPolicy[], seed: number): Result {
  const rng = createRng(seed);
  let { state } = createMatch(PRESET_YONMA, rng.int(2 ** 32));
  let maxDecisionMs = 0;
  let decisions = 0;
  for (let step = 0; state.phase !== 'matchEnded'; step++) {
    if (step > 20_000) throw new Error('partida não terminou');
    if (canStartNextHand(state)) {
      state = startNextHand(state, rng.int(2 ** 32)).state;
      continue;
    }
    const seat = ([0, 1, 2, 3] as Seat[]).find((s) => hasAnyAction(getLegalActions(state, s)));
    if (seat === undefined) throw new Error(`ninguém pode agir em ${state.phase}`);
    const view = getPlayerView(state, seat);
    const started = performance.now();
    const action = bots[seat]!.decide(view, view.legal, rng);
    maxDecisionMs = Math.max(maxDecisionMs, performance.now() - started);
    decisions += 1;
    state = applyAction(state, seat, action).state; // lança se o bot escolher ação ilegal
  }
  return { state, maxDecisionMs, decisions };
}

const CHARS: CharacterId[] = ['ren', 'akari', 'sora', 'sora'];

describe('bots Fácil e Normal', () => {
  it('jogam partidas completas só com ações legais', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const bots = CHARS.map((c, i) => createBot(i % 2 === 0 ? 'easy' : 'normal', c));
      const r = playMatch(bots, seed);
      expect(r.state.result).not.toBeNull();
      expect(r.decisions).toBeGreaterThan(100);
    }
  });

  it('decidem rápido o bastante para a thread principal (< 50 ms no pior caso típico)', () => {
    const bots = CHARS.map((c) => createBot('normal', c));
    const r = playMatch(bots, 99);
    // Margem para máquinas de CI mais lentas; o alvo de produto é ~50 ms.
    expect(r.maxDecisionMs).toBeLessThan(150);
  });

  it('Normal termina melhor colocado que Fácil, em média', () => {
    let normalPlacement = 0;
    let easyPlacement = 0;
    const games = 16;
    for (let seed = 1000; seed < 1000 + games; seed++) {
      // Assentos alternados para não favorecer posição.
      const normalSeats = seed % 2 === 0 ? [0, 2] : [1, 3];
      const bots = ([0, 1, 2, 3] as Seat[]).map((s) =>
        createBot(normalSeats.includes(s) ? 'normal' : 'easy', 'sora'),
      );
      const { state } = playMatch(bots, seed);
      const ranking = rankSeats(state.result!.finalScores);
      ranking.forEach((seat, place) => {
        if (normalSeats.includes(seat)) normalPlacement += place + 1;
        else easyPlacement += place + 1;
      });
    }
    expect(normalPlacement / (games * 2)).toBeLessThan(easyPlacement / (games * 2));
  });
});

describe('bot Difícil (Fase 6)', () => {
  it('joga partidas completas só com ações legais, nos três estilos', () => {
    for (let seed = 21; seed <= 22; seed++) {
      const bots = CHARS.map((c) => createBot('hard', c));
      const r = playMatch(bots, seed);
      expect(r.state.result).not.toBeNull();
    }
  });

  it('termina melhor colocado que o Fácil, em média', () => {
    let hard = 0;
    let easy = 0;
    const games = 12;
    for (let seed = 2000; seed < 2000 + games; seed++) {
      const hardSeats = seed % 2 === 0 ? [0, 2] : [1, 3];
      const bots = ([0, 1, 2, 3] as Seat[]).map((s) =>
        createBot(hardSeats.includes(s) ? 'hard' : 'easy', 'sora'),
      );
      const { state } = playMatch(bots, seed);
      rankSeats(state.result!.finalScores).forEach((seat, place) => {
        if (hardSeats.includes(seat)) hard += place + 1;
        else easy += place + 1;
      });
    }
    expect(hard / (games * 2)).toBeLessThan(easy / (games * 2));
  });
});
