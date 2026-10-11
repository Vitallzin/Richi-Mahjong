import type { YakuDef } from '../context';

/** Chankan: ron sobre a peça de um kakan (ou ankan, só para kokushi). 1 han. */
export const chankan: YakuDef = {
  id: 'chankan',
  kind: 'normal',
  evaluate: (ctx) => (ctx.win.chankan && ctx.win.winType === 'ron' ? 1 : 0),
};
