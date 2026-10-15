/**
 * Preferências do jogador (spec 6.5 e 12.1): persistidas em localStorage (`settings:v1`).
 * A seleção de regras fica salva por modalidade, mesmo com "avançadas" desligadas.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BotSkill, CharacterId } from '../bots';
import { DEFAULT_HELP_PREFS, type HelpPrefs } from '../help';
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
  /** Música ambiente (decisão do desenvolvedor, ADR 0012). */
  readonly music: boolean;
  readonly musicVolume: number;
  /** Som suave ao passar o mouse em botões e peças. */
  readonly hoverSounds: boolean;
  readonly autoSort: boolean;
  readonly helps: HelpPrefs;
  /** A tela de boas-vindas já foi vista (spec 9.1). */
  readonly welcomeSeen: boolean;
  /** Modo treino "Mostrar mãos" (spec 9.7), só em partida solo. */
  readonly training: boolean;
  readonly accessibility: AccessibilityPrefs;
}

export interface AccessibilityPrefs {
  readonly reduceMotion: boolean;
  readonly highContrast: boolean;
  /** Escala das peças da mão (1 = padrão). */
  readonly tileScale: 1 | 1.1 | 1.2;
}

export interface SettingsActions {
  set(patch: Partial<Omit<SettingsData, 'schemaVersion'>>): void;
  setRule(mode: Mode, id: RuleOptionId, value: unknown): void;
  resetRules(mode: Mode): void;
  setCharacter(index: number, choice: CharacterChoice): void;
  setHelp(patch: Partial<HelpPrefs>): void;
  setAccessibility(patch: Partial<AccessibilityPrefs>): void;
  resetAll(): void;
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
  music: true,
  musicVolume: 0.45,
  hoverSounds: true,
  autoSort: true,
  helps: DEFAULT_HELP_PREFS,
  welcomeSeen: false,
  training: false,
  accessibility: { reduceMotion: false, highContrast: false, tileScale: 1 },
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
      setHelp: (patch) => set((s) => ({ helps: { ...s.helps, ...patch } })),
      setAccessibility: (patch) =>
        set((s) => ({ accessibility: { ...s.accessibility, ...patch } })),
      resetAll: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'settings:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Preferências salvas por versões antigas não têm os campos novos: completa com os padrões.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsData>;
        return {
          ...current,
          ...p,
          helps: {
            ...current.helps,
            ...p.helps,
            labels: { ...current.helps.labels, ...p.helps?.labels },
          },
          accessibility: { ...current.accessibility, ...p.accessibility },
        };
      },
      partialize: ({
        set: _set,
        setRule: _setRule,
        resetRules: _reset,
        setCharacter: _setChar,
        setHelp: _setHelp,
        setAccessibility: _setA11y,
        resetAll: _resetAll,
        ...data
      }) => data,
    },
  ),
);
