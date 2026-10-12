/**
 * Contrato dos bots (spec 8.1). Recebem apenas a PlayerView do próprio assento: não existe caminho de
 * código para ver mãos ocultas ou o muro. O RNG só serve para desempates e ruído de decisão.
 */
import type { Action, LegalActions, PlayerView, Rng } from '../engine';

export type BotSkill = 'easy' | 'normal' | 'hard';

/** Estilo (personagem): escolhas entre opções razoáveis. Eixo independente da força (spec 8.2). */
export interface BotStyle {
  /** 0..1 vontade de chamar chi/pon. */
  readonly callTendency: number;
  /** 0..1 prefere riichi a manter dama. */
  readonly riichiTendency: number;
  /** 0..1 quanto recua diante de riichi. */
  readonly defenseWeight: number;
  /** 0..1 prioriza mão rápida vs mão valiosa. */
  readonly speedWeight: number;
  /** 0..1 persegue mãos caras (honitsu, yakuhai, dora). */
  readonly handValueWeight: number;
  /** 0..1 tolerância a descartar peças perigosas. */
  readonly risk: number;
}

export interface BotPolicy {
  decide(view: PlayerView, legal: LegalActions, rng: Rng): Action;
}

export const BALANCED_STYLE: BotStyle = Object.freeze({
  callTendency: 0.5,
  riichiTendency: 0.5,
  defenseWeight: 0.5,
  speedWeight: 0.5,
  handValueWeight: 0.5,
  risk: 0.5,
});
