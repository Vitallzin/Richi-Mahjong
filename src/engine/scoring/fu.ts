/** Cálculo de fu (spec 7.10). */
import { isDragon, isYaochu } from '../tiles';
import type { YakuContext } from '../yaku';

export const CHIITOITSU_FU = 25;

/** Fu de uma leitura. `pinfu` indica se a leitura tem o yaku pinfu. */
export function computeFu(ctx: YakuContext, pinfu: boolean): number {
  if (ctx.form === 'chiitoitsu') return CHIITOITSU_FU;
  if (ctx.form === 'kokushi') return 0;

  const isRon = ctx.win.winType === 'ron';
  if (pinfu) return isRon ? 30 : 20;

  let fu = 20;
  if (ctx.closed && isRon) fu += 10;
  if (!isRon) fu += 2;

  for (const g of ctx.groups) {
    if (g.type === 'seq') continue;
    let value = g.type === 'quad' ? 8 : 2;
    if (isYaochu(g.kind)) value *= 2;
    if (g.concealed) value *= 2;
    fu += value;
  }

  const pair = ctx.pair;
  if (pair !== null) {
    if (isDragon(pair)) fu += 2;
    if (pair === ctx.win.seatWind) fu += 2;
    if (pair === ctx.win.roundWind) fu += 2;
  }

  if (ctx.wait === 'kanchan' || ctx.wait === 'penchan' || ctx.wait === 'tanki') fu += 2;

  // Mão aberta que ficaria com 20 fu (forma de pinfu aberta) vale 30.
  if (!ctx.closed && fu === 20) return 30;
  return Math.ceil(fu / 10) * 10;
}
