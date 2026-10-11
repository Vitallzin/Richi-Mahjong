import type { YakuDef } from '../context';

/** Daburu riichi: riichi no primeiro descarte, sem chamadas antes. 2 han (substitui o riichi). */
export const doubleRiichi: YakuDef = {
  id: 'doubleRiichi',
  kind: 'normal',
  evaluate: (ctx) => (ctx.win.riichi === 'double' ? 2 : 0),
};
