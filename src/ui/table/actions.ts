import type { LegalActions } from '../../engine';

export type ActionKey =
  'tsumo' | 'ron' | 'riichi' | 'kan' | 'pon' | 'chi' | 'kita' | 'kyuushu' | 'pass';

/** Atalhos de teclado (documentados na tela de ajuda). */
export const ACTION_KEYS: Record<ActionKey, string> = {
  tsumo: 't',
  ron: 'w',
  riichi: 'r',
  kan: 'k',
  pon: 'p',
  chi: 'c',
  kita: 'n',
  kyuushu: '9',
  pass: 'Escape',
};

export function availableActions(legal: LegalActions): ActionKey[] {
  const out: ActionKey[] = [];
  if (legal.tsumo) out.push('tsumo');
  if (legal.ron) out.push('ron');
  if (legal.riichi.length > 0) out.push('riichi');
  if (legal.daiminkan || legal.ankan.length > 0 || legal.kakan.length > 0) out.push('kan');
  if (legal.pon.length > 0) out.push('pon');
  if (legal.chi.length > 0) out.push('chi');
  if (legal.kita) out.push('kita');
  if (legal.kyuushuKyuuhai) out.push('kyuushu');
  if (legal.pass) out.push('pass');
  return out;
}
