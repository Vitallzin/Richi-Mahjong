import { isWind } from '../../tiles';
import { triplets, type YakuDef } from '../context';

/** Daisuushii: trincas dos quatro ventos. Yakuman duplo (convenção adotada), com pao. */
export const daisuushii: YakuDef = {
  id: 'daisuushii',
  kind: 'yakuman',
  evaluate: (ctx) => {
    if (triplets(ctx).filter((g) => isWind(g.kind)).length !== 4) return 0;
    return ctx.rules.doubleYakuman ? 2 : 1;
  },
};
