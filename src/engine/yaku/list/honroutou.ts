import { isYaochu } from '../../tiles';
import { kindsPresent, sequences, type YakuDef } from '../context';

/** Honroutou: só terminais e honras (com toitoi ou chiitoitsu). 2 han. */
export const honroutou: YakuDef = {
  id: 'honroutou',
  kind: 'normal',
  evaluate: (ctx) =>
    ctx.form !== 'kokushi' && sequences(ctx).length === 0 && kindsPresent(ctx).every(isYaochu)
      ? 2
      : 0,
};
