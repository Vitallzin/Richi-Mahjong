import { isHonor } from '../../tiles';
import { kindsPresent, type YakuDef } from '../context';

/** Tsuuiisou: só honras. Yakuman. */
export const tsuuiisou: YakuDef = {
  id: 'tsuuiisou',
  kind: 'yakuman',
  evaluate: (ctx) => (kindsPresent(ctx).every(isHonor) ? 1 : 0),
};
