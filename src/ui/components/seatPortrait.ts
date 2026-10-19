/**
 * Retrato de um assento: personagem (selo com o hanzi do nome) para bots, avatar para quem tem conta,
 * inicial para o jogador local sem conta. Arte própria em CSS; retratos WebP do desenvolvedor podem
 * entrar aqui depois sem mudar quem usa o componente.
 */
import type { CSSProperties } from 'react';
import type { CharacterId } from '../../bots';
import type { SeatSetup } from '../../session';
import { avatarById } from '../../state/profile';

/** Ren 蓮 (lótus, calma), Akari 灯 (lanterna, fogo), Sora 空 (céu, equilíbrio). */
export const CHARACTER_ART: Readonly<
  Record<CharacterId, { glyph: string; colors: [string, string] }>
> = {
  ren: { glyph: '蓮', colors: ['#5f8fb0', '#1c3448'] },
  akari: { glyph: '灯', colors: ['#e0633a', '#6e1a12'] },
  sora: { glyph: '空', colors: ['#7a5fc4', '#2c1f52'] },
};

export function portraitOf(seat: SeatSetup | undefined, name: string) {
  if (seat?.kind === 'bot') {
    const art = CHARACTER_ART[seat.characterId];
    return { glyph: art.glyph, colors: art.colors };
  }
  if (seat?.kind === 'human' && seat.avatar && seat.avatar !== 'google') {
    const a = avatarById(seat.avatar);
    return { glyph: a.glyph, colors: a.colors };
  }
  return {
    glyph: name.slice(0, 1).toUpperCase(),
    colors: ['#7a5fc4', '#2c1f52'] as [string, string],
  };
}

/** Estilo inline com as cores do retrato (o formato fica com quem usa). */
export function portraitStyle(seat: SeatSetup | undefined, name: string): CSSProperties {
  const p = portraitOf(seat, name);
  return {
    background: `radial-gradient(circle at 35% 30%, ${p.colors[0]}, ${p.colors[1]})`,
    fontFamily: 'var(--font-brush)',
  };
}
