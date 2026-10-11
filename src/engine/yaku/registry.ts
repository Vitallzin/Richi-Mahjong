/** Registro de todos os yaku da v1 (spec 7.9), na ordem da tabela. */
import type { YakuDef, YakuId } from './context';
import { chankan } from './list/chankan';
import { chanta } from './list/chanta';
import { chiihou } from './list/chiihou';
import { chiitoitsu } from './list/chiitoitsu';
import { chinitsu } from './list/chinitsu';
import { chinroutou } from './list/chinroutou';
import { chuuren } from './list/chuuren';
import { daisangen } from './list/daisangen';
import { daisuushii } from './list/daisuushii';
import { doubleRiichi } from './list/doubleRiichi';
import { haitei } from './list/haitei';
import { honitsu } from './list/honitsu';
import { honroutou } from './list/honroutou';
import { houtei } from './list/houtei';
import { iipeikou } from './list/iipeikou';
import { ippatsu } from './list/ippatsu';
import { ittsu } from './list/ittsu';
import { junchan } from './list/junchan';
import { kokushi } from './list/kokushi';
import { menzenTsumo } from './list/menzenTsumo';
import { pinfu } from './list/pinfu';
import { riichi } from './list/riichi';
import { rinshan } from './list/rinshan';
import { ryanpeikou } from './list/ryanpeikou';
import { ryuuiisou } from './list/ryuuiisou';
import { sanankou } from './list/sanankou';
import { sankantsu } from './list/sankantsu';
import { sanshokuDoujun } from './list/sanshokuDoujun';
import { sanshokuDoukou } from './list/sanshokuDoukou';
import { shousangen } from './list/shousangen';
import { shousuushii } from './list/shousuushii';
import { suuankou } from './list/suuankou';
import { suukantsu } from './list/suukantsu';
import { tanyao } from './list/tanyao';
import { tenhou } from './list/tenhou';
import { toitoi } from './list/toitoi';
import { tsuuiisou } from './list/tsuuiisou';
import {
  yakuhaiChun,
  yakuhaiHaku,
  yakuhaiHatsu,
  yakuhaiRoundWind,
  yakuhaiSeatWind,
} from './list/yakuhai';

export const ALL_YAKU: readonly YakuDef[] = Object.freeze([
  riichi,
  ippatsu,
  menzenTsumo,
  tanyao,
  pinfu,
  iipeikou,
  yakuhaiHaku,
  yakuhaiHatsu,
  yakuhaiChun,
  yakuhaiSeatWind,
  yakuhaiRoundWind,
  haitei,
  houtei,
  rinshan,
  chankan,
  doubleRiichi,
  chiitoitsu,
  sanshokuDoujun,
  ittsu,
  chanta,
  toitoi,
  sanankou,
  sanshokuDoukou,
  sankantsu,
  shousangen,
  honroutou,
  honitsu,
  junchan,
  ryanpeikou,
  chinitsu,
  kokushi,
  suuankou,
  daisangen,
  shousuushii,
  daisuushii,
  tsuuiisou,
  chinroutou,
  ryuuiisou,
  chuuren,
  suukantsu,
  tenhou,
  chiihou,
]);

/** Yaku de yakuman sujeitos a pao (spec 6.2: só daisangen e daisuushii). */
export const PAO_YAKU: ReadonlySet<YakuId> = new Set<YakuId>(['daisangen', 'daisuushii']);

export const yakuById = (id: YakuId): YakuDef | undefined => ALL_YAKU.find((y) => y.id === id);
