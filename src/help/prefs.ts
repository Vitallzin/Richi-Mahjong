/** Preferências das ajudas (spec 9): cada uma liga/desliga e é persistida. */
import { DEFAULT_LABELS, type TileLabels } from './labels';

export interface HelpPrefs {
  /** Ajuda de regras: o que falta para completar, em linguagem simples. */
  readonly rules: boolean;
  /** Esperas e cópias não visíveis. */
  readonly waits: boolean;
  /** Aviso de No Yaku (ron × tsumo). */
  readonly noYaku: boolean;
  /** Aviso de furiten. */
  readonly furiten: boolean;
  /** Painel "Indicador → Dora". */
  readonly doraHint: boolean;
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
  furiten: true,
  doraHint: true,
  noCalls: false,
  riichi: 'confirm',
  labels: DEFAULT_LABELS,
});
