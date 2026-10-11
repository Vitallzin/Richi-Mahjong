import { isSimple } from '../../tiles';
import { kindsPresent, type YakuDef } from '../context';

/** Tanyao: só peças simples (2–8). 1 han; aberto só com a opção kuitan. */
export const tanyao: YakuDef = {
  id: 'tanyao',
  kind: 'normal',
  evaluate: (ctx) => {
    if (!kindsPresent(ctx).every(isSimple)) return 0;
    return ctx.closed || ctx.rules.kuitan ? 1 : 0;
  },
};
