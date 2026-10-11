import type { YakuDef } from '../context';

/** Tenhou: o dealer vence na compra inicial. Yakuman. */
export const tenhou: YakuDef = {
  id: 'tenhou',
  kind: 'yakuman',
  evaluate: (ctx) => (ctx.win.tenhou ? 1 : 0),
};
