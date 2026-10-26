/** Rótulos das regras em português (tela de configurar partida e "Regras desta partida" na mesa). */
import type { RuleOption } from '../../engine';
import { t, tKey } from '../../i18n';

export function ruleValueLabel(option: RuleOption, value: unknown): string {
  if (typeof value === 'boolean') return t(value ? 'rules.value.on' : 'rules.value.off');
  if (option.id === 'length') return tKey(`rules.length.${String(value)}`);
  return String(value);
}
