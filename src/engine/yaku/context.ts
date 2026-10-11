/**
 * Contexto de avaliação de yaku: uma leitura específica da mão vencedora (spec 7.9).
 */
import type { RuleSet } from '../rules';
import type { Tile, TileKind } from '../tiles';
import type { Meld } from '../types';

export type WinType = 'ron' | 'tsumo';

/** Situação da vitória (tudo o que não é a forma da mão). */
export interface WinSituation {
  readonly winType: WinType;
  readonly seatWind: TileKind;
  readonly roundWind: TileKind;
  readonly isDealer: boolean;
  readonly riichi: 'none' | 'riichi' | 'double';
  readonly ippatsu: boolean;
  readonly haitei: boolean;
  readonly houtei: boolean;
  readonly rinshan: boolean;
  /** Ron sobre kakan (ou ankan, para kokushi). Ron sobre kita NÃO é chankan. */
  readonly chankan: boolean;
  readonly tenhou: boolean;
  readonly chiihou: boolean;
}

/** Entrada completa para pontuar uma mão vencedora. */
export interface WinInput extends WinSituation {
  /** Peças fechadas, incluindo a peça vencedora. */
  readonly concealed: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly winTile: Tile;
  readonly doraIndicators: readonly TileKind[];
  /** Só usados se a mão estiver em riichi. */
  readonly uraIndicators: readonly TileKind[];
  readonly kitaCount: number;
  readonly rules: RuleSet;
}

export type WaitType = 'ryanmen' | 'kanchan' | 'penchan' | 'shanpon' | 'tanki' | 'kokushi13';

export interface Group {
  readonly type: 'seq' | 'trip' | 'quad';
  /** Para sequência, a menor peça. */
  readonly kind: TileKind;
  /** Veio de chamada (chi/pon/daiminkan/kakan). */
  readonly open: boolean;
  /** Conta como trinca/quadra fechada (ankou/ankan): não chamada e não completada por ron. */
  readonly concealed: boolean;
}

export interface YakuContext {
  readonly win: WinSituation;
  readonly rules: RuleSet;
  readonly form: 'regular' | 'chiitoitsu' | 'kokushi';
  /** Mão fechada (menzen). Ankan não abre a mão. */
  readonly closed: boolean;
  /** Forma padrão: os 4 grupos (fechados e chamados). Vazio nas formas especiais. */
  readonly groups: readonly Group[];
  readonly pair: TileKind | null;
  readonly wait: WaitType;
  readonly winKind: TileKind;
  /** Contagem de todas as peças da mão (fechadas + chamadas), por tipo. */
  readonly counts: readonly number[];
}

export type YakuId =
  | 'riichi'
  | 'ippatsu'
  | 'menzenTsumo'
  | 'tanyao'
  | 'pinfu'
  | 'iipeikou'
  | 'yakuhaiHaku'
  | 'yakuhaiHatsu'
  | 'yakuhaiChun'
  | 'yakuhaiSeatWind'
  | 'yakuhaiRoundWind'
  | 'haitei'
  | 'houtei'
  | 'rinshan'
  | 'chankan'
  | 'doubleRiichi'
  | 'chiitoitsu'
  | 'sanshokuDoujun'
  | 'ittsu'
  | 'chanta'
  | 'toitoi'
  | 'sanankou'
  | 'sanshokuDoukou'
  | 'sankantsu'
  | 'shousangen'
  | 'honroutou'
  | 'honitsu'
  | 'junchan'
  | 'ryanpeikou'
  | 'chinitsu'
  | 'kokushi'
  | 'suuankou'
  | 'daisangen'
  | 'shousuushii'
  | 'daisuushii'
  | 'tsuuiisou'
  | 'chinroutou'
  | 'ryuuiisou'
  | 'chuuren'
  | 'suukantsu'
  | 'tenhou'
  | 'chiihou';

export interface YakuDef {
  readonly id: YakuId;
  readonly kind: 'normal' | 'yakuman';
  /** Han (yaku normal) ou multiplicador de yakuman (1 ou 2). 0 = não se aplica. */
  evaluate(ctx: YakuContext): number;
}

/** Utilitários comuns aos yaku. */
export const sequences = (ctx: YakuContext): Group[] => ctx.groups.filter((g) => g.type === 'seq');
export const triplets = (ctx: YakuContext): Group[] => ctx.groups.filter((g) => g.type !== 'seq');
export const kindsPresent = (ctx: YakuContext): TileKind[] =>
  ctx.counts.flatMap((c, k) => (c > 0 ? [k] : []));
/** Tipos cobertos por um grupo (3 tipos para sequência). */
export const groupKinds = (g: Group): TileKind[] =>
  g.type === 'seq' ? [g.kind, g.kind + 1, g.kind + 2] : [g.kind];
/** Han por mão fechada/aberta; `open` = null ⇒ yaku só fechado. */
export const byOpenness = (ctx: YakuContext, closed: number, open: number | null): number =>
  ctx.closed ? closed : (open ?? 0);
