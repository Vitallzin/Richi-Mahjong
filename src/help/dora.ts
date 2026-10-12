/** Ajuda "Indicador → Dora" (spec 9.5): a confusão clássica de iniciantes. */
import { doraFromIndicator, type PlayerView, type TileKind } from '../engine';

export interface DoraPair {
  readonly indicator: TileKind;
  readonly dora: TileKind;
}

export const doraPairs = (view: PlayerView): DoraPair[] =>
  view.doraIndicators.map((t) => ({
    indicator: t.kind,
    dora: doraFromIndicator(t.kind, view.rules.mode),
  }));
