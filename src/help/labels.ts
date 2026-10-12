/**
 * Rótulos das pedras (spec 9.4): camada independente do tema. Retorna só dados; o texto em
 * português vem do i18n na UI.
 */
import { CHUN, EAST, HAKU, isHonor, isWind, numberOf, type TileKind } from '../engine';

export interface TileLabels {
  /** Número sobre manzu/pinzu/souzu. */
  readonly numbers: boolean;
  readonly winds: 'off' | 'abbr' | 'name' | 'both';
  readonly dragons: 'off' | 'abbr' | 'name';
}

export const DEFAULT_LABELS: TileLabels = Object.freeze({
  numbers: true,
  winds: 'name',
  dragons: 'off',
});

export type LabelSpec =
  | { readonly type: 'number'; readonly n: number }
  | {
      readonly type: 'wind';
      readonly index: 0 | 1 | 2 | 3;
      readonly form: 'abbr' | 'name' | 'both';
    }
  | { readonly type: 'dragon'; readonly index: 0 | 1 | 2; readonly form: 'abbr' | 'name' };

/** O que mostrar na camada de rótulo de uma peça, ou null. */
export function labelFor(kind: TileKind, labels: TileLabels): LabelSpec | null {
  if (!isHonor(kind)) return labels.numbers ? { type: 'number', n: numberOf(kind) } : null;
  if (isWind(kind)) {
    return labels.winds === 'off'
      ? null
      : { type: 'wind', index: (kind - EAST) as 0 | 1 | 2 | 3, form: labels.winds };
  }
  if (kind >= HAKU && kind <= CHUN) {
    return labels.dragons === 'off'
      ? null
      : { type: 'dragon', index: (kind - HAKU) as 0 | 1 | 2, form: labels.dragons };
  }
  return null;
}
