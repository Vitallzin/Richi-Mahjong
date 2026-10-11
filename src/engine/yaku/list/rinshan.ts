import type { YakuDef } from '../context';

/** Rinshan kaihou: vence com a peça de reposição (após kan ou, no sanma, kita). 1 han. */
export const rinshan: YakuDef = {
  id: 'rinshan',
  kind: 'normal',
  evaluate: (ctx) => (ctx.win.rinshan && ctx.win.winType === 'tsumo' ? 1 : 0),
};
