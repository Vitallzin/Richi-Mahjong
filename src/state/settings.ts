/**
 * Preferências do jogador (spec 6.5 e 12.1): persistidas em localStorage (`settings:v1`).
 * A seleção de regras fica salva por modalidade, mesmo com "avançadas" desligadas.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BotSkill, CharacterId } from '../bots';
import type { Mode, RuleOptionId } from '../engine';
import { DEFAULT_TIMER, type TimerSettings } from '../session';

export type CharacterChoice = CharacterId | 'random';
export type RuleDraft = Partial<Record<RuleOptionId, unknown>>;

export interface SettingsData {
  readonly schemaVersion: 1;
  readonly mode: Mode;
  readonly advanced: Readonly<Record<Mode, boolean>>;
  readonly rules: Readonly<Record<Mode, RuleDraft>>;
  readonly timer: TimerSettings;
  readonly difficulty: BotSkill;
  readonly characters: readonly CharacterChoice[];
  readonly volume: number;
  readonly muted: boolean;
  readonly autoSort: boolean;
}

export interface SettingsActions {
  set(patch: Partial<Omit<SettingsData, 'schemaVersion'>>): void;
  setRule(mode: Mode, id: RuleOptionId, value: unknown): void;
  resetRules(mode: Mode): void;
  setCharacter(index: number, choice: CharacterChoice): void;
}

export const DEFAULT_SETTINGS: SettingsData = {
  schemaVersion: 1,
  mode: 'yonma',
  advanced: { yonma: false, sanma: false },
  rules: { yonma: {}, sanma: {} },
  timer: DEFAULT_TIMER,
  difficulty: 'normal',
  characters: ['ren', 'akari', 'sora'],
  volume: 0.8,
  muted: false,
  autoSort: true,
};

export const useSettings = create<SettingsData & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      setRule: (mode, id, value) =>
        set((s) => ({ rules: { ...s.rules, [mode]: { ...s.rules[mode], [id]: value } } })),
      resetRules: (mode) => set((s) => ({ rules: { ...s.rules, [mode]: {} } })),
      setCharacter: (index, choice) =>
        set((s) => {
          const characters = [...s.characters];
          characters[index] = choice;
          return { characters };
        }),
    }),
    {
      name: 'settings:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({
        set: _set,
        setRule: _setRule,
        resetRules: _reset,
        setCharacter: _setChar,
        ...data
      }) => data,
    },
  ),
);
