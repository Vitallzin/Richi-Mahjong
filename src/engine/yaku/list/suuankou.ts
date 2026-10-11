import { concealedTriplets } from '../helpers';
import type { YakuDef } from '../context';

/** Suuankou: quatro trincas/quadras fechadas. Yakuman (duplo na espera tanki). */
export const suuankou: YakuDef = {
  id: 'suuankou',
  kind: 'yakuman',
  evaluate: (ctx) => {
    if (concealedTriplets(ctx) !== 4) return 0;
    return ctx.wait === 'tanki' && ctx.rules.doubleYakuman ? 2 : 1;
  },
};
