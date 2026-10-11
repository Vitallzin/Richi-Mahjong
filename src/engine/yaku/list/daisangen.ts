import { isDragon } from '../../tiles';
import { triplets, type YakuDef } from '../context';

/** Daisangen: trincas dos três dragões. Yakuman (com pao). */
export const daisangen: YakuDef = {
  id: 'daisangen',
  kind: 'yakuman',
  evaluate: (ctx) => (triplets(ctx).filter((g) => isDragon(g.kind)).length === 3 ? 1 : 0),
};
