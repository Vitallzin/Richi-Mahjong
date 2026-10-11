import { isHonor, suitOf } from '../../tiles';
import { byOpenness, kindsPresent, type YakuDef } from '../context';

/** Honitsu: um só naipe mais honras. 3 han fechado / 2 aberto. */
export const honitsu: YakuDef = {
  id: 'honitsu',
  kind: 'normal',
  evaluate: (ctx) => {
    const kinds = kindsPresent(ctx);
    const suits = new Set(kinds.filter((k) => !isHonor(k)).map(suitOf));
    const hasHonor = kinds.some(isHonor);
    return suits.size === 1 && hasHonor ? byOpenness(ctx, 3, 2) : 0;
  },
};
