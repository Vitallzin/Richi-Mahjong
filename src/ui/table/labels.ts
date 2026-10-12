import { EAST, type Seat, type TileKind } from '../../engine';
import { t } from '../../i18n';
import type { SeatSetup } from '../../session';

const WINDS = ['east', 'south', 'west', 'north'] as const;

export const windName = (kind: TileKind): string => t(`wind.${WINDS[(kind - EAST) % 4] ?? 'east'}`);
export const windShort = (kind: TileKind): string =>
  t(`wind.short.${WINDS[(kind - EAST) % 4] ?? 'east'}`);
/** Kanji decorativo do vento (spec 10.2: 東一局 pequeno, para o jogador absorver os termos). */
export const windKanji = (kind: TileKind): string =>
  ['東', '南', '西', '北'][(kind - EAST) % 4] ?? '東';
export const NUMBER_KANJI = ['一', '二', '三', '四'] as const;

export function seatName(seats: readonly SeatSetup[], seat: Seat): string {
  const s = seats[seat];
  if (!s) return '?';
  return s.kind === 'human' ? s.name : t(`characters.${s.characterId}.name`);
}

/** Posição relativa na mesa: 0 = você (embaixo), 1 = direita, 2 = frente, 3 = esquerda. */
export const relativeSide = (seat: Seat, local: Seat, players: number): number => {
  const r = (seat - local + players) % players;
  // No sanma a frente fica vazia: o seguinte senta à direita e o anterior à esquerda.
  return players === 3 && r === 2 ? 3 : r;
};
