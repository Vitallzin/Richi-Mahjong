import type { YakuDef } from '../context';

/** Toitoi: quatro trincas/quadras. 2 han. */
export const toitoi: YakuDef = {
  id: 'toitoi',
  kind: 'normal',
  evaluate: (ctx) => (ctx.form === 'regular' && ctx.groups.every((g) => g.type !== 'seq') ? 2 : 0),
};
