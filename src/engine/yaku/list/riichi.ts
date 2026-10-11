import type { YakuDef } from '../context';

/** Riichi: declarou riichi com a mão fechada. 1 han. */
export const riichi: YakuDef = {
  id: 'riichi',
  kind: 'normal',
  evaluate: (ctx) => (ctx.win.riichi === 'riichi' ? 1 : 0),
};
