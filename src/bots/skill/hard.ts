import type { SkillParams } from '../core';

/**
 * Difícil (provisório até a Fase 6, quando ganha valor esperado, contexto de placar e Web Worker):
 * por ora é o Normal com pouco ruído e defesa mais completa (kabe, terminais).
 */
export const HARD: SkillParams = Object.freeze({
  noise: 0.02,
  useUkeire: true,
  defense: 'full',
  requireYakuToCall: true,
  alwaysRiichi: false,
});
