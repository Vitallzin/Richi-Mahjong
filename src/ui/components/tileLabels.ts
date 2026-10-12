import { createContext, useContext } from 'react';
import type { TileKind } from '../../engine';
import { labelFor, type TileLabels } from '../../help';
import { t } from '../../i18n';

/** Rótulos ativos para as pedras abaixo deste contexto (null = nenhum). */
export const TileLabelsContext = createContext<TileLabels | null>(null);

export const useTileLabels = () => useContext(TileLabelsContext);

const WINDS = ['east', 'south', 'west', 'north'] as const;

/** Texto do rótulo de uma peça em português, ou null. */
export function labelText(kind: TileKind, labels: TileLabels): string | null {
  const spec = labelFor(kind, labels);
  if (!spec) return null;
  if (spec.type === 'number') return String(spec.n);
  if (spec.type === 'wind') {
    const abbr = t(`wind.short.${WINDS[spec.index]}`);
    const name = t(`wind.${WINDS[spec.index]}`);
    return spec.form === 'abbr' ? abbr : spec.form === 'name' ? name : `${abbr} · ${name}`;
  }
  return t(`label.dragon.${spec.form}.${spec.index}`);
}
