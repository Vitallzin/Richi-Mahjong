import { identicalSequencePairs } from '../helpers';
import type { YakuDef } from '../context';

/** Ryanpeikou: duas vezes iipeikou, mão fechada. 3 han. */
export const ryanpeikou: YakuDef = {
  id: 'ryanpeikou',
  kind: 'normal',
  evaluate: (ctx) => (ctx.closed && identicalSequencePairs(ctx) === 2 ? 3 : 0),
};
