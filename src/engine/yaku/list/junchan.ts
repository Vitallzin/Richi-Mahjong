import { isHonor } from '../../tiles';
import { allGroupsTouch } from '../helpers';
import { byOpenness, sequences, type YakuDef } from '../context';

/** Junchan: todo grupo e o par têm terminal, sem honras, com ao menos uma sequência. 3 / 2 han. */
export const junchan: YakuDef = {
  id: 'junchan',
  kind: 'normal',
  evaluate: (ctx) => {
    if (!allGroupsTouch(ctx, 'terminal') || sequences(ctx).length === 0) return 0;
    const hasHonor = ctx.counts.some((c, k) => c > 0 && isHonor(k));
    return hasHonor ? 0 : byOpenness(ctx, 3, 2);
  },
};
