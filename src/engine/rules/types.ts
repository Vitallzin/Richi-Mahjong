import type { Mode } from '../tiles';

export type MatchLength = 'oneHand' | 'east' | 'south';
export type HanMinimum = 1 | 2 | 4;

/** Opções personalizáveis (spec 6.3). */
export interface RuleSelection {
  length: MatchLength;
  startingPoints: number;
  targetPoints: number;
  tobi: boolean;
  agariYame: boolean;
  akaDora: number;
  kuitan: boolean;
  hanMinimum: HanMinimum;
  kiriageMangan: boolean;
  tsumoLoss: boolean;
  nukiDora: boolean;
}

/** Regras fixas da modalidade (spec 6.2). Não aparecem na tela de configuração. */
export interface FixedRules {
  readonly players: 3 | 4;
  /** Bastão de honba no ron, por honba. */
  readonly honbaRon: number;
  /** Bastão de honba no tsumo, por pagador e por honba. */
  readonly honbaTsumoPerPayer: number;
  /** Total do pagamento de noten no empate por exaustão. */
  readonly notenTotal: number;
  readonly riichiCost: number;
  /** Peças mínimas no muro vivo para declarar riichi. */
  readonly riichiMinWall: number;
  readonly maxKans: number;
  /** Quantidade de mãos por vento (4 no yonma, 3 no sanma). */
  readonly handsPerWind: number;
  readonly chi: boolean;
  readonly abortive: {
    readonly kyuushuKyuuhai: boolean;
    readonly suufonRenda: boolean;
    readonly suukaikan: boolean;
    readonly suuchaRiichi: boolean;
  };
  readonly nagashiMangan: boolean;
  readonly kazoeYakuman: boolean;
  readonly doubleYakuman: boolean;
}

/** Conjunto de regras congelado guardado no estado da partida (spec 6.1). */
export interface RuleSet extends RuleSelection, FixedRules {
  readonly mode: Mode;
}
