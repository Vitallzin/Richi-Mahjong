import type { YakuDef } from '../context';

/** Kokushi musou: os 13 órfãos + um par. Yakuman (duplo na espera de 13). */
export const kokushi: YakuDef = {
  id: 'kokushi',
  kind: 'yakuman',
  evaluate: (ctx) => {
    if (ctx.form !== 'kokushi') return 0;
    return ctx.wait === 'kokushi13' && ctx.rules.doubleYakuman ? 2 : 1;
  },
};
