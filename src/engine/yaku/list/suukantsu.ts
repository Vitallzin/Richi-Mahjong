import type { YakuDef } from '../context';

/** Suukantsu: quatro quadras. Yakuman. */
export const suukantsu: YakuDef = {
  id: 'suukantsu',
  kind: 'yakuman',
  evaluate: (ctx) => (ctx.groups.filter((g) => g.type === 'quad').length === 4 ? 1 : 0),
};
