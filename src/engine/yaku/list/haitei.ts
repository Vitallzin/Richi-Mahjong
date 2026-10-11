import type { YakuDef } from '../context';

/** Haitei raoyue: tsumo na última peça do muro vivo. 1 han. */
export const haitei: YakuDef = {
  id: 'haitei',
  kind: 'normal',
  evaluate: (ctx) => (ctx.win.haitei && ctx.win.winType === 'tsumo' && !ctx.win.rinshan ? 1 : 0),
};
