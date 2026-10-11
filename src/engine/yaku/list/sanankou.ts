import { concealedTriplets } from '../helpers';
import type { YakuDef } from '../context';

/** Sanankou: três trincas/quadras fechadas (trinca completada por ron não conta). 2 han. */
export const sanankou: YakuDef = {
  id: 'sanankou',
  kind: 'normal',
  evaluate: (ctx) => (concealedTriplets(ctx) === 3 ? 2 : 0),
};
