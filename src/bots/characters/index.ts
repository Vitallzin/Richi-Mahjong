/**
 * Personagens da v1 (spec 8.3): estilo independente da dificuldade. Nomes provisórios; os retratos
 * serão atribuídos pelo desenvolvedor. Textos (nome exibido, frase, descrição) ficam no i18n.
 */
import type { BotStyle } from '../policy';

export type CharacterId = 'ren' | 'akari' | 'sora';

export interface Character {
  readonly id: CharacterId;
  /** Chaves i18n: characters.<id>.name / .quote / .style */
  readonly style: BotStyle;
}

export const CHARACTERS: readonly Character[] = Object.freeze([
  {
    id: 'ren',
    style: {
      callTendency: 0.3,
      riichiTendency: 0.4,
      defenseWeight: 0.9,
      speedWeight: 0.4,
      handValueWeight: 0.5,
      risk: 0.15,
    },
  },
  {
    id: 'akari',
    style: {
      callTendency: 0.85,
      riichiTendency: 0.8,
      defenseWeight: 0.25,
      speedWeight: 0.85,
      handValueWeight: 0.35,
      risk: 0.8,
    },
  },
  {
    id: 'sora',
    style: {
      callTendency: 0.5,
      riichiTendency: 0.5,
      defenseWeight: 0.5,
      speedWeight: 0.5,
      handValueWeight: 0.5,
      risk: 0.5,
    },
  },
]);

export const characterById = (id: CharacterId): Character => {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`Personagem desconhecido: ${id}`);
  return c;
};
