import { isGreen } from '../../tiles';
import { kindsPresent, type YakuDef } from '../context';

/** Ryuuiisou: só peças verdes (2s 3s 4s 6s 8s e Verde). Yakuman. */
export const ryuuiisou: YakuDef = {
  id: 'ryuuiisou',
  kind: 'yakuman',
  evaluate: (ctx) => (kindsPresent(ctx).every(isGreen) ? 1 : 0),
};
