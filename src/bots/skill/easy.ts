import type { SkillParams } from '../core';

/** Fácil: reduz o shanten de forma gulosa, com bastante ruído; não defende; chama sem critério de yaku. */
export const EASY: SkillParams = Object.freeze({
  noise: 0.35,
  useUkeire: false,
  defense: 'none',
  requireYakuToCall: false,
  alwaysRiichi: true,
});
