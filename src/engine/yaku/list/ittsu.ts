import { sequences, byOpenness, type YakuDef } from '../context';

/** Ittsu: 123, 456 e 789 do mesmo naipe. 2 han fechado / 1 aberto. */
export const ittsu: YakuDef = {
  id: 'ittsu',
  kind: 'normal',
  evaluate: (ctx) => {
    const starts = new Set(sequences(ctx).map((g) => g.kind));
    for (const base of [0, 9, 18]) {
      if (starts.has(base) && starts.has(base + 3) && starts.has(base + 6)) {
        return byOpenness(ctx, 2, 1);
      }
    }
    return 0;
  },
};
