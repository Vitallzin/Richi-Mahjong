import { isHonor } from '../../tiles';
import { allGroupsTouch } from '../helpers';
import { byOpenness, sequences, type YakuDef } from '../context';

/**
 * Chanta: todo grupo e o par têm terminal ou honra, com ao menos uma sequência e uma honra.
 * 2 han fechado / 1 aberto.
 */
export const chanta: YakuDef = {
  id: 'chanta',
  kind: 'normal',
  evaluate: (ctx) => {
    if (!allGroupsTouch(ctx, 'yaochu') || sequences(ctx).length === 0) return 0;
    const hasHonor = ctx.counts.some((c, k) => c > 0 && isHonor(k));
    return hasHonor ? byOpenness(ctx, 2, 1) : 0;
  },
};
