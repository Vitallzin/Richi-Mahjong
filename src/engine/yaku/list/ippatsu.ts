import type { YakuDef } from '../context';

/** Ippatsu: vence até uma volta após o riichi, sem chamadas no intervalo. 1 han. */
export const ippatsu: YakuDef = {
  id: 'ippatsu',
  kind: 'normal',
  evaluate: (ctx) => (ctx.win.ippatsu && ctx.win.riichi !== 'none' ? 1 : 0),
};
