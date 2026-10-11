/**
 * Simulador de linha de comando (aceite da Fase 1): joga partidas bot-aleatório-legal × bot-aleatório-legal
 * verificando invariantes. Uso: `npm run sim -- --games 5000 --mode yonma --seed 1`.
 */
import { parseArgs } from 'node:util';
import { presetFor, type Mode } from '../src/engine';
import { emptyStats, simulateMatch } from '../tests/support/simulator';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '100' },
    mode: { type: 'string', default: 'yonma' },
    seed: { type: 'string', default: '1' },
    check: { type: 'boolean', default: false },
  },
});

const games = Number(values.games);
const mode = values.mode as Mode;
const firstSeed = Number(values.seed);
const rules = presetFor(mode);
const stats = emptyStats();
const started = performance.now();

for (let i = 0; i < games; i++) {
  const seed = firstSeed + i;
  try {
    simulateMatch(
      rules,
      seed,
      values.check ? { exhaustiveLegalEvery: 5, illegalProbeEvery: 7 } : {},
      stats,
    );
  } catch (e) {
    console.error(`Falha na partida com semente ${seed}:`, e);
    process.exit(1);
  }
  if ((i + 1) % Math.max(1, Math.floor(games / 10)) === 0) {
    const elapsed = (performance.now() - started) / 1000;
    console.log(`${i + 1}/${games} partidas (${elapsed.toFixed(1)} s)`);
  }
}

const elapsed = (performance.now() - started) / 1000;
console.log(
  `\n${games} partidas ${mode} em ${elapsed.toFixed(1)} s (${(stats.steps / elapsed).toFixed(0)} ações/s)`,
);
console.log(JSON.stringify(stats, null, 2));
