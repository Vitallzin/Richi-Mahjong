import { CHUN, HAKU, HATSU, type TileKind } from '../../tiles';
import { triplets, type YakuContext, type YakuDef, type YakuId } from '../context';

const hasTriplet = (ctx: YakuContext, kind: TileKind) => triplets(ctx).some((g) => g.kind === kind);

const tripletOf = (id: YakuId, kindOf: (ctx: YakuContext) => TileKind): YakuDef => ({
  id,
  kind: 'normal',
  evaluate: (ctx) => (hasTriplet(ctx, kindOf(ctx)) ? 1 : 0),
});

/*
 * Yakuhai: trinca/quadra de dragão, do vento do assento ou do vento da rodada. 1 han cada; vento
 * duplo conta duas vezes. No sanma, o Norte nunca é vento do assento nem da rodada.
 */
export const yakuhaiHaku = tripletOf('yakuhaiHaku', () => HAKU);
export const yakuhaiHatsu = tripletOf('yakuhaiHatsu', () => HATSU);
export const yakuhaiChun = tripletOf('yakuhaiChun', () => CHUN);
export const yakuhaiSeatWind = tripletOf('yakuhaiSeatWind', (ctx) => ctx.win.seatWind);
export const yakuhaiRoundWind = tripletOf('yakuhaiRoundWind', (ctx) => ctx.win.roundWind);
