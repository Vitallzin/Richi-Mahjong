/** Perfil do jogador (spec 12.2 e 12.5): nome de exibição e avatares temáticos. */

export const NAME_MAX = 24;

/** Nome de exibição seguro: sem controles, espaços colapsados, até 24 caracteres. */
export function sanitizeDisplayName(raw: string): string {
  const clean = raw
    .replace(/\p{Cc}|\p{Cf}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...clean].slice(0, NAME_MAX).join('').trim();
}

export interface AvatarDef {
  readonly id: string;
  readonly glyph: string;
  /** Duas cores do fundo (gradiente). */
  readonly colors: readonly [string, string];
}

/** Avatares temáticos (arte própria em CSS: hanzi sobre laca). Sem upload (spec 12.5). */
export const AVATARS: readonly AvatarDef[] = [
  { id: 'chun', glyph: '中', colors: ['#d9473c', '#7a1a14'] },
  { id: 'hatsu', glyph: '發', colors: ['#3f8f78', '#1d4b3e'] },
  { id: 'haku', glyph: '白', colors: ['#6a7bb8', '#2c3566'] },
  { id: 'east', glyph: '東', colors: ['#b98a37', '#5e4210'] },
  { id: 'south', glyph: '南', colors: ['#c05a2a', '#5c240c'] },
  { id: 'west', glyph: '西', colors: ['#7a5fc4', '#2c1f52'] },
  { id: 'north', glyph: '北', colors: ['#2f6f9a', '#12304a'] },
  { id: 'dragon', glyph: '龍', colors: ['#a3263a', '#3a0c16'] },
  { id: 'sakura', glyph: '櫻', colors: ['#e88db4', '#7a2c52'] },
  { id: 'moon', glyph: '月', colors: ['#c9b27a', '#3a3150'] },
  { id: 'tiger', glyph: '虎', colors: ['#d98a2b', '#5a3008'] },
  { id: 'crane', glyph: '鶴', colors: ['#5f8fb0', '#1c3448'] },
];

export const DEFAULT_AVATAR = 'chun';
export const GOOGLE_AVATAR = 'google';

export const avatarById = (id: string): AvatarDef =>
  AVATARS.find((a) => a.id === id) ?? (AVATARS[0] as AvatarDef);
