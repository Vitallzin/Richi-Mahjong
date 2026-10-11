import type { YakuDef } from '../context';

/** Sankantsu: três quadras. 2 han. */
export const sankantsu: YakuDef = {
  id: 'sankantsu',
  kind: 'normal',
  evaluate: (ctx) => (ctx.groups.filter((g) => g.type === 'quad').length === 3 ? 2 : 0),
};
