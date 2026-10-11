import { isTerminal } from '../../tiles';
import { kindsPresent, type YakuDef } from '../context';

/** Chinroutou: só terminais (1 e 9). Yakuman. */
export const chinroutou: YakuDef = {
  id: 'chinroutou',
  kind: 'yakuman',
  evaluate: (ctx) => (kindsPresent(ctx).every(isTerminal) ? 1 : 0),
};
