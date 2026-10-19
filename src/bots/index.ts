import { createPolicy, type SkillParams } from './core';
import { characterById, type CharacterId } from './characters';
import type { BotPolicy, BotSkill } from './policy';
import { EASY } from './skill/easy';
import { createHardPolicy } from './hard/decide';
import { NORMAL } from './skill/normal';

export * from './policy';
export * from './characters';

const SKILLS: Readonly<Record<'easy' | 'normal', SkillParams>> = { easy: EASY, normal: NORMAL };

/** Bot com uma força e o estilo de um personagem. */
export const createBot = (skill: BotSkill, character: CharacterId): BotPolicy =>
  skill === 'hard'
    ? createHardPolicy(characterById(character).style)
    : createPolicy(SKILLS[skill], characterById(character).style);
