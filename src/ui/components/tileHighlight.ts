import { createContext, useContext } from 'react';
import type { TileKind } from '../../engine';

/**
 * Destaques da camada de ajudas das pedras (spec 11.2, camada 4), fornecidos pela mesa:
 * - `bonusKinds`: tipos que são dora agora (os cincos vermelhos sempre contam);
 * - `matchKind`: tipo da peça sob o mouse na mão; as cópias visíveis na mesa brilham.
 */
export interface TileHighlight {
  readonly bonusGlow: boolean;
  readonly bonusKinds: ReadonlySet<TileKind>;
  readonly matchKind: TileKind | null;
}

export const TileHighlightContext = createContext<TileHighlight | null>(null);

export const useTileHighlight = () => useContext(TileHighlightContext);
