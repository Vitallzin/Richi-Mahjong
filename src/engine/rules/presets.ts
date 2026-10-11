/**
 * Presets "Padrão" = Mahjong Soul ranqueado (spec 6.2). Referência única para motor e testes:
 * nada de números mágicos espalhados. Mudanças aqui devem ser registradas em docs/adr/0000.
 */
import type { Mode } from '../tiles';
import type { FixedRules, RuleSelection, RuleSet } from './types';

export const FIXED_YONMA: FixedRules = Object.freeze({
  players: 4,
  honbaRon: 300,
  honbaTsumoPerPayer: 100,
  notenTotal: 3000,
  riichiCost: 1000,
  riichiMinWall: 4,
  maxKans: 4,
  handsPerWind: 4,
  chi: true,
  abortive: Object.freeze({
    kyuushuKyuuhai: true,
    suufonRenda: true,
    suukaikan: true,
    suuchaRiichi: true,
  }),
  nagashiMangan: true,
  kazoeYakuman: true,
  doubleYakuman: true,
});

export const FIXED_SANMA: FixedRules = Object.freeze({
  players: 3,
  // Provisório (spec 16.B.17): as fontes divergem entre 300/3.000 e 200/2.000.
  honbaRon: 300,
  honbaTsumoPerPayer: 100,
  notenTotal: 3000,
  riichiCost: 1000,
  riichiMinWall: 4,
  maxKans: 4,
  handsPerWind: 3,
  chi: false,
  abortive: Object.freeze({
    kyuushuKyuuhai: true,
    suufonRenda: false,
    suukaikan: true,
    suuchaRiichi: false,
  }),
  nagashiMangan: true,
  kazoeYakuman: true,
  doubleYakuman: true,
});

export const DEFAULT_SELECTION: Readonly<Record<Mode, RuleSelection>> = Object.freeze({
  yonma: Object.freeze({
    length: 'south',
    startingPoints: 25_000,
    targetPoints: 30_000,
    tobi: true,
    agariYame: true,
    akaDora: 3,
    kuitan: true,
    hanMinimum: 1,
    kiriageMangan: false,
    tsumoLoss: false,
    nukiDora: false,
  }),
  sanma: Object.freeze({
    length: 'south',
    startingPoints: 35_000,
    targetPoints: 40_000,
    tobi: true,
    agariYame: true,
    akaDora: 2,
    kuitan: true,
    hanMinimum: 1,
    kiriageMangan: false,
    tsumoLoss: true,
    nukiDora: true,
  }),
});

export const PRESET_YONMA: RuleSet = Object.freeze({
  mode: 'yonma',
  ...DEFAULT_SELECTION.yonma,
  ...FIXED_YONMA,
});

export const PRESET_SANMA: RuleSet = Object.freeze({
  mode: 'sanma',
  ...DEFAULT_SELECTION.sanma,
  ...FIXED_SANMA,
});

export const presetFor = (mode: Mode): RuleSet => (mode === 'yonma' ? PRESET_YONMA : PRESET_SANMA);
