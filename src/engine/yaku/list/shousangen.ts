import { isDragon } from '../../tiles';
import { triplets, type YakuDef } from '../context';

/** Shousangen: duas trincas de dragão e o par do terceiro. 2 han (além dos yakuhai). */
export const shousangen: YakuDef = {
  id: 'shousangen',
  kind: 'normal',
  evaluate: (ctx) =>
    ctx.pair !== null &&
    isDragon(ctx.pair) &&
    triplets(ctx).filter((g) => isDragon(g.kind)).length === 2
      ? 2
      : 0,
};
