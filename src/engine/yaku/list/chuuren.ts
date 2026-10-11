import { isHonor, KIND_COUNT } from '../../tiles';
import type { YakuDef } from '../context';

const PATTERN = [3, 1, 1, 1, 1, 1, 1, 1, 3];

/** Chuuren poutou: 1112345678999 + uma peça do mesmo naipe, fechada. Yakuman (duplo na espera de 9). */
export const chuuren: YakuDef = {
  id: 'chuuren',
  kind: 'yakuman',
  evaluate: (ctx) => {
    if (!ctx.closed || ctx.groups.some((g) => g.type === 'quad') || isHonor(ctx.winKind)) return 0;
    const base = Math.floor(ctx.winKind / 9) * 9;
    let total = 0;
    for (let k = 0; k < KIND_COUNT; k++) {
      const c = ctx.counts[k] as number;
      total += c;
      if (c > 0 && (k < base || k >= base + 9)) return 0;
    }
    if (total !== 14) return 0;
    const suit = ctx.counts.slice(base, base + 9);
    if (!suit.every((c, i) => c >= (PATTERN[i] as number))) return 0;
    const pure = suit.every((c, i) => c - (base + i === ctx.winKind ? 1 : 0) === PATTERN[i]);
    return pure && ctx.rules.doubleYakuman ? 2 : 1;
  },
};
