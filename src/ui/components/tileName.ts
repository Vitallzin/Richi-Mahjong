import { numberOf, suitOf, type Tile } from '../../engine';
import { t } from '../../i18n';

/** Rótulo para leitor de tela, em português (spec 10.7): ex. "5 de bambu, vermelho". */
export function tileName(tile: Tile): string {
  const suit = suitOf(tile.kind);
  const n = numberOf(tile.kind);
  const name =
    suit === 'z'
      ? t(`tile.honor.${n as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)
      : t('tile.number', { n, suit: t(`tile.suit.${suit}`) });
  return tile.red ? t('tile.red', { name }) : name;
}
