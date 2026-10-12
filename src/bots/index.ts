import { createPolicy, type SkillParams } from './core';
import { characterById, type CharacterId } from './characters';
import type { BotPolicy, BotSkill } from './policy';
import { EASY } from './skill/easy';
import { HARD } from './skill/hard';
import { NORMAL } from './skill/normal';

export * from './policy';
export * from './characters';

const SKILLS: Readonly<Record<BotSkill, SkillParams>> = { easy: EASY, normal: NORMAL, hard: HARD };

/** Bot com uma força e o estilo de um personagem. */
export const createBot = (skill: BotSkill, character: CharacterId): BotPolicy =>
  createPolicy(SKILLS[skill], characterById(character).style);
