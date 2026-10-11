import { identicalSequencePairs } from '../helpers';
import type { YakuDef } from '../context';

/** Iipeikou: duas sequências idênticas, mão fechada. 1 han (não acumula com ryanpeikou). */
export const iipeikou: YakuDef = {
  id: 'iipeikou',
  kind: 'normal',
  evaluate: (ctx) => (ctx.closed && identicalSequencePairs(ctx) === 1 ? 1 : 0),
};
