// Simulação curta (roda no CI a cada push). A longa (≥ 5.000 partidas) fica em tests/sim/.
import { buildRuleSet, PRESET_YONMA } from '../src/engine';
import { emptyStats, simulateMatch } from './support/simulator';

vi.setConfig({ testTimeout: 120_000 });

describe('simulação bot × bot (yonma)', () => {
  it('partidas Leste-Sul terminam sem violar invariantes', () => {
    const stats = emptyStats();
    for (let seed = 1; seed <= 20; seed++) {
      simulateMatch(PRESET_YONMA, seed, { exhaustiveLegalEvery: 7, illegalProbeEvery: 11 }, stats);
    }
    expect(stats.hands).toBeGreaterThan(100);
    expect(stats.wins).toBeGreaterThan(0);
  });

  it('variações de regras: só Leste, uma mão, sem vermelhas, pontos personalizados', () => {
    const variants = [
      buildRuleSet('yonma', { length: 'east' }),
      buildRuleSet('yonma', { length: 'oneHand' }),
      buildRuleSet('yonma', { akaDora: 0, kuitan: false, hanMinimum: 2 }),
      buildRuleSet('yonma', { startingPoints: 10_000, targetPoints: 20_000, akaDora: 4 }),
      buildRuleSet('yonma', { tobi: false, agariYame: false, kiriageMangan: true }),
    ];
    variants.forEach((rules, i) => {
      for (let seed = 100; seed < 106; seed++)
        simulateMatch(rules, seed * 31 + i, { illegalProbeEvery: 5 });
    });
  });

  it('mesma semente ⇒ mesma partida (determinismo)', () => {
    const a = simulateMatch(PRESET_YONMA, 4242);
    const b = simulateMatch(PRESET_YONMA, 4242);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = simulateMatch(PRESET_YONMA, 4243);
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });
});
