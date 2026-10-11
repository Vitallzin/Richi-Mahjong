// Simulação longa (aceite da Fase 1): ≥ 5.000 partidas yonma sem violar invariantes.
// Roda com `npm run test:sim` (job separado/manual no CI).
import { PRESET_YONMA } from '../../src/engine';
import { emptyStats, simulateMatch } from '../support/simulator';

const GAMES = Number(process.env.SIM_GAMES ?? 5000);

describe(`simulação longa: ${GAMES} partidas yonma`, () => {
  it('nenhuma invariante violada e toda partida termina', () => {
    const stats = emptyStats();
    for (let seed = 1; seed <= GAMES; seed++) {
      simulateMatch(
        PRESET_YONMA,
        seed * 7919,
        { illegalProbeEvery: 50, exhaustiveLegalEvery: 97 },
        stats,
      );
    }
    expect(stats.hands).toBeGreaterThan(GAMES * 5);
    expect(stats.wins).toBeGreaterThan(0);
  });
});
