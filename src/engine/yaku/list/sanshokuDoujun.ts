import { sequences, byOpenness, type YakuDef } from '../context';

/** Sanshoku doujun: a mesma sequência nos três naipes. 2 han fechado / 1 aberto. */
export const sanshokuDoujun: YakuDef = {
  id: 'sanshokuDoujun',
  kind: 'normal',
  evaluate: (ctx) => {
    const starts = new Set(sequences(ctx).map((g) => g.kind));
    for (let n = 0; n < 7; n++) {
      if (starts.has(n) && starts.has(n + 9) && starts.has(n + 18)) return byOpenness(ctx, 2, 1);
    }
    return 0;
  },
};
