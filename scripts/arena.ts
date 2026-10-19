/**
 * Arena de bots (aceite da Fase 6): duas forças em assentos alternados, muitas partidas.
 *   npm run arena -- --games 200 --a hard --b normal [--mode sanma] [--seed 1] [--char sora]
 * Mostra colocação média, pontos médios e o tempo da decisão mais lenta de cada lado.
 */
import { createBot, type BotSkill, type CharacterId } from '../src/bots';
import {
  applyAction,
  canStartNextHand,
  createMatch,
  createRng,
  getLegalActions,
  getPlayerView,
  hasAnyAction,
  PRESET_SANMA,
  PRESET_YONMA,
  rankSeats,
  startNextHand,
  type Seat,
} from '../src/engine';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};

const games = Number(arg('games', '100'));
const a = arg('a', 'hard') as BotSkill;
const b = arg('b', 'normal') as BotSkill;
const rules = arg('mode', 'yonma') === 'sanma' ? PRESET_SANMA : PRESET_YONMA;
const seed0 = Number(arg('seed', '1'));
const chars = arg('char', 'ren,akari,sora,sora').split(',') as CharacterId[];
const n = rules.players;

// Separado por "lado" (a mesma força pode jogar dos dois lados numa comparação de controle).
const sideA = `${a}#A`;
const sideB = `${b}#B`;
const stat: Record<string, { place: number; points: number; count: number; maxMs: number }> = {
  [sideA]: { place: 0, points: 0, count: 0, maxMs: 0 },
  [sideB]: { place: 0, points: 0, count: 0, maxMs: 0 },
};

const started = Date.now();
for (let g = 0; g < games; g++) {
  const rng = createRng(seed0 * 7919 + g);
  // Alterna quem fica nos assentos pares, para não favorecer posição.
  const aSeats = new Set(Array.from({ length: n }, (_, i) => i).filter((i) => i % 2 === g % 2));
  const bots = Array.from({ length: n }, (_, i) =>
    createBot(aSeats.has(i) ? a : b, chars[i % chars.length] ?? 'sora'),
  );
  let { state } = createMatch(rules, rng.int(2 ** 32));
  for (let step = 0; state.phase !== 'matchEnded'; step++) {
    if (step > 40_000) throw new Error('partida não terminou');
    if (canStartNextHand(state)) {
      state = startNextHand(state, rng.int(2 ** 32)).state;
      continue;
    }
    const seat = Array.from({ length: n }, (_, i) => i as Seat).find((s) =>
      hasAnyAction(getLegalActions(state, s)),
    );
    if (seat === undefined) throw new Error('ninguém pode agir');
    const view = getPlayerView(state, seat);
    const t0 = performance.now();
    const action = bots[seat]!.decide(view, view.legal, rng);
    const ms = performance.now() - t0;
    const side = stat[aSeats.has(seat) ? sideA : sideB]!;
    side.maxMs = Math.max(side.maxMs, ms);
    state = applyAction(state, seat, action).state;
  }
  const result = state.result!;
  rankSeats(result.finalScores).forEach((seat, place) => {
    const side = stat[aSeats.has(seat) ? sideA : sideB]!;
    side.place += place + 1;
    side.points += result.finalScores[seat] ?? 0;
    side.count += 1;
  });
  if ((g + 1) % 20 === 0)
    console.log(`${g + 1}/${games} (${((Date.now() - started) / 1000).toFixed(0)} s)`);
}

for (const key of [sideA, sideB]) {
  const s = stat[key]!;
  console.log(
    `${key.padEnd(9)} colocação média ${(s.place / s.count).toFixed(3)} · pontos médios ${Math.round(s.points / s.count)} · decisão mais lenta ${s.maxMs.toFixed(1)} ms`,
  );
}
