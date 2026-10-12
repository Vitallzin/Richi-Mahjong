/**
 * Desenho das faces em CSS (spec 11.3, opção 2): posições em % dentro da face, cores por elemento.
 * Arte original do projeto; um tema futuro pode trocar por SVG sem mudar o componente Tile.
 */

export type Dot = {
  readonly x: number;
  readonly y: number;
  readonly c: 'b' | 'g' | 'r';
  readonly s?: number;
};
export type Bar = {
  readonly x: number;
  readonly y: number;
  readonly c: 'g' | 'r';
  readonly rot?: number;
};

const col3 = [25, 50, 75];
const row3 = [22, 50, 78];

/** Círculos (pinzu) de 1 a 9. */
export const PIN_DOTS: Readonly<Record<number, readonly Dot[]>> = {
  1: [{ x: 50, y: 50, c: 'r', s: 2.6 }],
  2: [
    { x: 50, y: 28, c: 'g', s: 1.5 },
    { x: 50, y: 72, c: 'b', s: 1.5 },
  ],
  3: [
    { x: 26, y: 22, c: 'b', s: 1.2 },
    { x: 50, y: 50, c: 'r', s: 1.2 },
    { x: 74, y: 78, c: 'g', s: 1.2 },
  ],
  4: [
    { x: 30, y: 28, c: 'b', s: 1.3 },
    { x: 70, y: 28, c: 'g', s: 1.3 },
    { x: 30, y: 72, c: 'g', s: 1.3 },
    { x: 70, y: 72, c: 'b', s: 1.3 },
  ],
  5: [
    { x: 28, y: 24, c: 'b', s: 1.15 },
    { x: 72, y: 24, c: 'g', s: 1.15 },
    { x: 50, y: 50, c: 'r', s: 1.15 },
    { x: 28, y: 76, c: 'g', s: 1.15 },
    { x: 72, y: 76, c: 'b', s: 1.15 },
  ],
  6: [
    { x: 30, y: 20, c: 'g' },
    { x: 70, y: 20, c: 'g' },
    { x: 30, y: 52, c: 'r' },
    { x: 70, y: 52, c: 'r' },
    { x: 30, y: 80, c: 'r' },
    { x: 70, y: 80, c: 'r' },
  ],
  7: [
    { x: 24, y: 14, c: 'g', s: 0.85 },
    { x: 50, y: 22, c: 'g', s: 0.85 },
    { x: 76, y: 30, c: 'g', s: 0.85 },
    { x: 32, y: 58, c: 'r', s: 0.85 },
    { x: 68, y: 58, c: 'r', s: 0.85 },
    { x: 32, y: 83, c: 'r', s: 0.85 },
    { x: 68, y: 83, c: 'r', s: 0.85 },
  ],
  8: [
    { x: 30, y: 14, c: 'b', s: 0.85 },
    { x: 70, y: 14, c: 'b', s: 0.85 },
    { x: 30, y: 38, c: 'b', s: 0.85 },
    { x: 70, y: 38, c: 'b', s: 0.85 },
    { x: 30, y: 62, c: 'b', s: 0.85 },
    { x: 70, y: 62, c: 'b', s: 0.85 },
    { x: 30, y: 86, c: 'b', s: 0.85 },
    { x: 70, y: 86, c: 'b', s: 0.85 },
  ],
  9: col3.flatMap((x, i) =>
    row3.map((y) => ({ x, y, c: (i === 1 ? 'r' : i === 0 ? 'b' : 'g') as Dot['c'], s: 0.8 })),
  ),
};

/** Bambus (souzu) de 2 a 9; o 1 tem desenho próprio. */
export const SOU_BARS: Readonly<Record<number, readonly Bar[]>> = {
  2: [
    { x: 50, y: 28, c: 'g' },
    { x: 50, y: 72, c: 'g' },
  ],
  3: [
    { x: 50, y: 28, c: 'g' },
    { x: 32, y: 72, c: 'g' },
    { x: 68, y: 72, c: 'g' },
  ],
  4: [
    { x: 32, y: 28, c: 'g' },
    { x: 68, y: 28, c: 'g' },
    { x: 32, y: 72, c: 'g' },
    { x: 68, y: 72, c: 'g' },
  ],
  5: [
    { x: 26, y: 28, c: 'g' },
    { x: 74, y: 28, c: 'g' },
    { x: 50, y: 50, c: 'r' },
    { x: 26, y: 72, c: 'g' },
    { x: 74, y: 72, c: 'g' },
  ],
  6: [
    { x: 26, y: 28, c: 'g' },
    { x: 50, y: 28, c: 'g' },
    { x: 74, y: 28, c: 'g' },
    { x: 26, y: 72, c: 'g' },
    { x: 50, y: 72, c: 'g' },
    { x: 74, y: 72, c: 'g' },
  ],
  7: [
    { x: 50, y: 16, c: 'r' },
    ...[26, 50, 74].flatMap((x) => [
      { x, y: 50, c: 'g' as const },
      { x, y: 82, c: 'g' as const },
    ]),
  ],
  8: [
    { x: 22, y: 28, c: 'g' },
    { x: 40, y: 28, c: 'g', rot: 25 },
    { x: 60, y: 28, c: 'g', rot: -25 },
    { x: 78, y: 28, c: 'g' },
    { x: 22, y: 72, c: 'g' },
    { x: 40, y: 72, c: 'g', rot: -25 },
    { x: 60, y: 72, c: 'g', rot: 25 },
    { x: 78, y: 72, c: 'g' },
  ],
  9: col3.flatMap((x, i) => row3.map((y) => ({ x, y, c: (i === 1 ? 'r' : 'g') as Bar['c'] }))),
};

export const MAN_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
export const MAN_CHAR = '萬';

/** Honras: 1z..7z. O Branco é desenhado como moldura vazia. */
export const HONOR_GLYPHS = ['東', '南', '西', '北', '', '發', '中'] as const;
