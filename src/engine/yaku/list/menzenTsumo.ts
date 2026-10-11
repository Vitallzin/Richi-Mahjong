import type { YakuDef } from '../context';

/** Menzen tsumo (tsumo fechado): vence por tsumo com a mão fechada. 1 han. */
export const menzenTsumo: YakuDef = {
  id: 'menzenTsumo',
  kind: 'normal',
  evaluate: (ctx) => (ctx.closed && ctx.win.winType === 'tsumo' ? 1 : 0),
};
