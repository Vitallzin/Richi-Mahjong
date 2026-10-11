import type { YakuDef } from '../context';

/** Houtei raoyui: ron no último descarte da mão. 1 han. */
export const houtei: YakuDef = {
  id: 'houtei',
  kind: 'normal',
  evaluate: (ctx) => (ctx.win.houtei && ctx.win.winType === 'ron' ? 1 : 0),
};
