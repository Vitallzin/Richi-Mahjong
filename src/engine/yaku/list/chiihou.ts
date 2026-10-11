import type { YakuDef } from '../context';

/** Chiihou: não-dealer vence no 1º tsumo, sem chamadas antes (kita conta como chamada). Yakuman. */
export const chiihou: YakuDef = {
  id: 'chiihou',
  kind: 'yakuman',
  evaluate: (ctx) => (ctx.win.chiihou ? 1 : 0),
};
