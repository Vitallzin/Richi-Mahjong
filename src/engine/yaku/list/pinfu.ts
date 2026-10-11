import { isValuedPair } from '../helpers';
import type { YakuDef } from '../context';

/** Pinfu: mão fechada com 4 sequências, par sem valor e espera ryanmen. 1 han. */
export const pinfu: YakuDef = {
  id: 'pinfu',
  kind: 'normal',
  evaluate: (ctx) =>
    ctx.closed &&
    ctx.form === 'regular' &&
    ctx.groups.every((g) => g.type === 'seq') &&
    ctx.pair !== null &&
    !isValuedPair(ctx.pair, ctx.win) &&
    ctx.wait === 'ryanmen'
      ? 1
      : 0,
};
