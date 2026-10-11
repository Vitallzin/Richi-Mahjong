import { triplets, type YakuDef } from '../context';

/** Sanshoku doukou: a mesma trinca nos três naipes. 2 han. */
export const sanshokuDoukou: YakuDef = {
  id: 'sanshokuDoukou',
  kind: 'normal',
  evaluate: (ctx) => {
    const kinds = new Set(triplets(ctx).map((g) => g.kind));
    for (let n = 0; n < 9; n++) {
      if (kinds.has(n) && kinds.has(n + 9) && kinds.has(n + 18)) return 2;
    }
    return 0;
  },
};
