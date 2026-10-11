import type { YakuDef } from '../context';

/** Chiitoitsu: sete pares distintos. 2 han (25 fu fixos). */
export const chiitoitsu: YakuDef = {
  id: 'chiitoitsu',
  kind: 'normal',
  evaluate: (ctx) => (ctx.form === 'chiitoitsu' ? 2 : 0),
};
