// Simulação longa (aceite da Fase 4): ≥ 5.000 partidas sanma sem violar invariantes.
// Roda com `npm run test:sim` (job separado/manual no CI).
import { PRESET_SANMA } from '../../src/engine';
import { emptyStats, simulateMatch } from '../support/simulator';

const GAMES = Number(process.env.SIM_GAMES ?? 5000);

describe(`simulação longa: ${GAMES} partidas sanma`, () => {
  it('nenhuma invariante violada e toda partida termina', () => {
    const stats = emptyStats();
    for (let seed = 1; seed <= GAMES; seed++) {
      simulateMatch(
        PRESET_SANMA,
        seed * 104729,
        { illegalProbeEvery: 50, exhaustiveLegalEvery: 97 },
        stats,
      );
    }
    expect(stats.hands).toBeGreaterThan(GAMES * 5);
    expect(stats.wins).toBeGreaterThan(0);
  });
});
