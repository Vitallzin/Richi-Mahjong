import { isWind } from '../../tiles';
import { triplets, type YakuDef } from '../context';

/** Shousuushii: três trincas de vento e o par do quarto. Yakuman. */
export const shousuushii: YakuDef = {
  id: 'shousuushii',
  kind: 'yakuman',
  evaluate: (ctx) =>
    ctx.pair !== null &&
    isWind(ctx.pair) &&
    triplets(ctx).filter((g) => isWind(g.kind)).length === 3
      ? 1
      : 0,
};
