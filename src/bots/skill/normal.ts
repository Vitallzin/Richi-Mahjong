import type { SkillParams } from '../core';

/**
 * Normal: shanten + ukeire com peças visíveis descontadas, só abre a mão com caminho de yaku,
 * defesa simples (genbutsu/suji/honras vistas) quando há riichi e a mão está longe.
 */
export const NORMAL: SkillParams = Object.freeze({
  noise: 0.08,
  useUkeire: true,
  defense: 'simple',
  requireYakuToCall: true,
  alwaysRiichi: false,
});
