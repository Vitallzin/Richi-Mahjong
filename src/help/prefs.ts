/** Preferências das ajudas (spec 9): cada uma liga/desliga e é persistida. */
import { DEFAULT_LABELS, type TileLabels } from './labels';

export interface HelpPrefs {
  /** Ajuda de regras: o que falta para completar, em linguagem simples. */
  readonly rules: boolean;
  /** Esperas e cópias não visíveis. */
  readonly waits: boolean;
  /** Aviso de No Yaku (ron × tsumo). */
  readonly noYaku: boolean;
  /** Caminho de yaku: qual yaku a mão está seguindo (ex.: Toitoi). */
  readonly yakuPath: boolean;
  /** Aviso de furiten. */
  readonly furiten: boolean;
  /** Painel "Indicador → Dora". */
  readonly doraHint: boolean;
  /** Peças de bônus (dora e cincos vermelhos) brilham discretamente. */
  readonly bonusGlow: boolean;
  /** Ao passar o mouse numa peça da mão, as cópias já visíveis na mesa (rios, grupos, dora) brilham. */
  readonly seenHighlight: boolean;
  /** Modo iniciante: não oferecer chi/pon/kan. */
  readonly noCalls: boolean;
  /** Riichi: sugerir com confirmação, ou declarar direto quando há um único descarte possível. */
  readonly riichi: 'confirm' | 'auto';
  readonly labels: TileLabels;
}

export const DEFAULT_HELP_PREFS: HelpPrefs = Object.freeze({
  rules: true,
  waits: true,
  noYaku: true,
  yakuPath: true,
  furiten: true,
  doraHint: true,
  bonusGlow: true,
  seenHighlight: true,
  noCalls: false,
  riichi: 'confirm',
  labels: DEFAULT_LABELS,
});
