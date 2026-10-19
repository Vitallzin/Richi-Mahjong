/**
 * Aparência (spec 11.2, antecipada para a Fase 5 — ADR 0014): fundo, feltro, faces e verso escolhidos
 * de forma independente. Cada opção é um conjunto de variáveis CSS (o "theme.json" de cada camada),
 * aplicado no <html>; pedras, cenário e mesa leem essas variáveis. A camada de ajudas não muda.
 * A escolha é local do jogador (em sala não sincroniza).
 */

export type BackgroundId = 'sakura' | 'jade' | 'crimson' | 'ink';
export type FeltId = 'violet' | 'jade' | 'crimson' | 'indigo' | 'ink';
export type FacesId = 'ivory' | 'celadon' | 'night';
export type BackId = 'violet' | 'jade' | 'cinnabar' | 'gold' | 'indigo';

export interface Appearance {
  readonly background: BackgroundId;
  readonly felt: FeltId;
  readonly faces: FacesId;
  readonly back: BackId;
}

export const DEFAULT_APPEARANCE: Appearance = Object.freeze({
  background: 'sakura',
  felt: 'violet',
  faces: 'ivory',
  back: 'violet',
});

type Vars = Readonly<Record<string, string>>;

export interface AppearanceOption<Id extends string> {
  readonly id: Id;
  /** Hanzi decorativo do cartão de escolha. */
  readonly glyph: string;
  readonly vars: Vars;
}

export const BACKGROUNDS: readonly AppearanceOption<BackgroundId>[] = [
  {
    id: 'sakura',
    glyph: '櫻',
    vars: {
      '--bd-sky-a': '#1c1336',
      '--bd-sky-b': '#140d24',
      '--bd-sky-c': '#0e0919',
      '--bd-glow': '#3a2860',
      '--bd-moon-a': '#fff8e6',
      '--bd-moon-b': '#f3e2b8',
      '--bd-moon-c': '#d9bf83',
      '--bd-roof-a': '#2b1d45',
      '--bd-roof-b': '#140d22',
      '--bd-far': '#1d1431',
      '--bd-lantern-a': '#ff9d5c',
      '--bd-lantern-b': '#d9473c',
      '--bd-lantern-c': '#8e1f1b',
      '--bd-petal-a': '#ffd6e7',
      '--bd-petal-b': '#e88db4',
    },
  },
  {
    id: 'jade',
    glyph: '翠',
    vars: {
      '--bd-sky-a': '#0f2a2c',
      '--bd-sky-b': '#0b1d22',
      '--bd-sky-c': '#071216',
      '--bd-glow': '#1f4f4a',
      '--bd-moon-a': '#f4fff8',
      '--bd-moon-b': '#d4efe2',
      '--bd-moon-c': '#9cc9b4',
      '--bd-roof-a': '#16363a',
      '--bd-roof-b': '#0a181c',
      '--bd-far': '#12292c',
      '--bd-lantern-a': '#ffd38a',
      '--bd-lantern-b': '#e09a3a',
      '--bd-lantern-c': '#9a5a14',
      '--bd-petal-a': '#e9fff2',
      '--bd-petal-b': '#9fdcbc',
    },
  },
  {
    id: 'crimson',
    glyph: '霞',
    vars: {
      '--bd-sky-a': '#3a1424',
      '--bd-sky-b': '#24101c',
      '--bd-sky-c': '#140812',
      '--bd-glow': '#6b2438',
      '--bd-moon-a': '#fff1dc',
      '--bd-moon-b': '#ffc98f',
      '--bd-moon-c': '#e8894a',
      '--bd-roof-a': '#3a1a2a',
      '--bd-roof-b': '#1a0b14',
      '--bd-far': '#2c1220',
      '--bd-lantern-a': '#ffb36b',
      '--bd-lantern-b': '#e0552c',
      '--bd-lantern-c': '#931f12',
      '--bd-petal-a': '#ffe0c2',
      '--bd-petal-b': '#f29a7a',
    },
  },
  {
    id: 'ink',
    glyph: '墨',
    vars: {
      '--bd-sky-a': '#26262c',
      '--bd-sky-b': '#18181d',
      '--bd-sky-c': '#0c0c10',
      '--bd-glow': '#3c3c46',
      '--bd-moon-a': '#ffffff',
      '--bd-moon-b': '#e6e6e6',
      '--bd-moon-c': '#b8b8b8',
      '--bd-roof-a': '#2a2a31',
      '--bd-roof-b': '#111115',
      '--bd-far': '#1e1e24',
      '--bd-lantern-a': '#ffd28a',
      '--bd-lantern-b': '#c9a14a',
      '--bd-lantern-c': '#7a5a1c',
      '--bd-petal-a': '#f4f4f4',
      '--bd-petal-b': '#bdbdbd',
    },
  },
];

export const FELTS: readonly AppearanceOption<FeltId>[] = [
  {
    id: 'violet',
    glyph: '紫',
    vars: { '--color-felt': '#241a3a', '--felt-glow': 'rgb(120 90 190 / 0.18)' },
  },
  {
    id: 'jade',
    glyph: '碧',
    vars: { '--color-felt': '#123631', '--felt-glow': 'rgb(80 190 150 / 0.16)' },
  },
  {
    id: 'crimson',
    glyph: '朱',
    vars: { '--color-felt': '#3a1621', '--felt-glow': 'rgb(220 90 90 / 0.16)' },
  },
  {
    id: 'indigo',
    glyph: '靛',
    vars: { '--color-felt': '#14203f', '--felt-glow': 'rgb(90 130 220 / 0.18)' },
  },
  {
    id: 'ink',
    glyph: '玄',
    vars: { '--color-felt': '#1c1c22', '--felt-glow': 'rgb(200 200 220 / 0.08)' },
  },
];

export const FACES: readonly AppearanceOption<FacesId>[] = [
  {
    id: 'ivory',
    glyph: '象',
    vars: {
      '--face-a': '#fffdf6',
      '--face-b': '#f3ebd9',
      '--face-c': '#e7dcc4',
      '--face-border': 'rgb(120 100 70 / 0.35)',
      '--ink-dark': '#1d2340',
      '--ink-red': '#c4303e',
      '--ink-green': '#1f7a4a',
      '--ink-blue': '#1d4f9a',
      '--ink-haku': '#3d5fa8',
      '--dot-ring': '#ffffff',
    },
  },
  {
    id: 'celadon',
    glyph: '青',
    vars: {
      '--face-a': '#f4fbf6',
      '--face-b': '#dcefe3',
      '--face-c': '#c3decd',
      '--face-border': 'rgb(60 110 90 / 0.4)',
      '--ink-dark': '#173a35',
      '--ink-red': '#b3283a',
      '--ink-green': '#13684a',
      '--ink-blue': '#1f4f86',
      '--ink-haku': '#2f6f8a',
      '--dot-ring': '#f4fbf6',
    },
  },
  {
    id: 'night',
    glyph: '夜',
    vars: {
      '--face-a': '#3a2f55',
      '--face-b': '#2a2142',
      '--face-c': '#1f1833',
      '--face-border': 'rgb(240 211 145 / 0.45)',
      '--ink-dark': '#f3ead6',
      '--ink-red': '#ff7a7a',
      '--ink-green': '#7fd1b0',
      '--ink-blue': '#8fb8ff',
      '--ink-haku': '#f0d391',
      '--dot-ring': '#2a2142',
    },
  },
];

export const BACKS: readonly AppearanceOption<BackId>[] = [
  { id: 'violet', glyph: '紫', vars: { '--color-tile-back': '#4a3488', '--tile-edge': '#5b4aa3' } },
  { id: 'jade', glyph: '翠', vars: { '--color-tile-back': '#1f6b56', '--tile-edge': '#2f8a6f' } },
  {
    id: 'cinnabar',
    glyph: '朱',
    vars: { '--color-tile-back': '#9a2a24', '--tile-edge': '#c0453a' },
  },
  { id: 'gold', glyph: '金', vars: { '--color-tile-back': '#9a7224', '--tile-edge': '#c29a45' } },
  { id: 'indigo', glyph: '靛', vars: { '--color-tile-back': '#233a7a', '--tile-edge': '#3a56a0' } },
];

const find = <Id extends string>(list: readonly AppearanceOption<Id>[], id: Id) =>
  list.find((o) => o.id === id) ?? (list[0] as AppearanceOption<Id>);

/** Todas as variáveis CSS da combinação escolhida (opção desconhecida cai na padrão). */
export function appearanceVars(a: Appearance): Vars {
  return {
    ...find(BACKGROUNDS, a.background).vars,
    ...find(FELTS, a.felt).vars,
    ...find(FACES, a.faces).vars,
    ...find(BACKS, a.back).vars,
  };
}

/** Aplica no <html>: todas as telas (e a mesa) passam a usar a aparência escolhida. */
export function applyAppearance(a: Appearance, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(appearanceVars(a)))
    root.style.setProperty(name, value);
}
