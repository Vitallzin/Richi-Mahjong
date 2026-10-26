/**
 * Configuração de uma sala ↔ preferências locais. Criar a sala usa as escolhas da tela de configurar
 * partida; editar as regras (fase 3) carrega o que está na sala de volta nessa mesma tela.
 */
import {
  buildRuleSet,
  DEFAULT_SELECTION,
  RULE_OPTIONS,
  type RuleSet,
  type RuleOptionId,
} from '../engine';
import type { RoomMeta } from '../session';
import type { RoomConfig, RoomSettings } from './roomController';
import { useSettings, type RuleDraft, type SettingsData } from './settings';

/** Regras e preferências escolhidas na tela de configurar partida, no formato da sala. */
export function roomConfigFromSettings(s: SettingsData): RoomConfig {
  const rules = buildRuleSet(s.mode, s.rules[s.mode], s.advanced[s.mode]);
  const settings: RoomSettings = {
    timer: s.timer,
    training: false,
    difficulty: s.difficulty,
    characters: s.characters,
  };
  return {
    rules: JSON.stringify(rules),
    settings: JSON.stringify(settings),
    mode: s.mode,
    players: rules.players,
  };
}

/** Coloca as regras da sala nas preferências locais (a tela de configurar mostra o que vale na sala). */
export function applyRoomConfig(meta: RoomMeta): void {
  const rules = JSON.parse(meta.rules) as RuleSet;
  const settings = JSON.parse(meta.settings) as RoomSettings;
  const mode = rules.mode;
  const values = rules as unknown as Readonly<Record<string, unknown>>;
  const defaults = DEFAULT_SELECTION[mode];
  const draft: Partial<Record<RuleOptionId, unknown>> = {};
  let advanced = false;
  for (const o of RULE_OPTIONS) {
    if (!o.modes.includes(mode) || !(o.id in values)) continue;
    draft[o.id] = values[o.id];
    if (o.group === 'advanced' && values[o.id] !== defaults[o.id]) advanced = true;
  }
  const s = useSettings.getState();
  s.set({
    mode,
    rules: { ...s.rules, [mode]: draft as RuleDraft },
    advanced: { ...s.advanced, [mode]: advanced },
    timer: settings.timer,
    difficulty: settings.difficulty,
    characters: settings.characters,
  });
}
