import { isHonor, suitOf } from '../../tiles';
import { byOpenness, kindsPresent, type YakuDef } from '../context';

/** Chinitsu: um só naipe, sem honras. 6 han fechado / 5 aberto. */
export const chinitsu: YakuDef = {
  id: 'chinitsu',
  kind: 'normal',
  evaluate: (ctx) => {
    const kinds = kindsPresent(ctx);
    if (kinds.some(isHonor)) return 0;
    return new Set(kinds.map(suitOf)).size === 1 ? byOpenness(ctx, 6, 5) : 0;
  },
};
