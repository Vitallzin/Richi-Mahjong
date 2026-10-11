/**
 * Peças: tipos, índices e utilitários (spec 7.1).
 *
 * Índices de tipo (`TileKind`): 0–8 manzu (1m–9m), 9–17 pinzu, 18–26 souzu, 27–33 honras
 * (1z Leste, 2z Sul, 3z Oeste, 4z Norte, 5z Branco, 6z Verde, 7z Vermelho).
 * Cada peça física tem `id = kind * 4 + cópia` (0..135). A peça vermelha é a cópia 0 (ou 0 e 1
 * para o 5p com 4 vermelhas) do 5 do naipe.
 */

export type Suit = 'm' | 'p' | 's' | 'z';
export type TileKind = number;
export type Tile = { readonly id: number; readonly kind: TileKind; readonly red: boolean };
export type Mode = 'yonma' | 'sanma';

export const KIND_COUNT = 34;
export const COPIES = 4;
export const TOTAL_TILES = KIND_COUNT * COPIES;

export const EAST = 27;
export const SOUTH = 28;
export const WEST = 29;
export const NORTH = 30;
export const HAKU = 31;
export const HATSU = 32;
export const CHUN = 33;

export const FIVE_M = 4;
export const FIVE_P = 13;
export const FIVE_S = 22;

const SUITS: readonly Suit[] = ['m', 'p', 's', 'z'];

export const suitOf = (kind: TileKind): Suit => SUITS[Math.floor(kind / 9)] as Suit;

/** Número da peça (1–9 nos naipes, 1–7 nas honras). */
export const numberOf = (kind: TileKind): number => (kind % 9) + 1;

export const isHonor = (kind: TileKind): boolean => kind >= 27;
export const isSuited = (kind: TileKind): boolean => kind < 27;
export const isWind = (kind: TileKind): boolean => kind >= EAST && kind <= NORTH;
export const isDragon = (kind: TileKind): boolean => kind >= HAKU;
export const isTerminal = (kind: TileKind): boolean =>
  kind < 27 && (kind % 9 === 0 || kind % 9 === 8);
/** Terminal ou honra (yaochuuhai). */
export const isYaochu = (kind: TileKind): boolean => isHonor(kind) || isTerminal(kind);
/** Peça simples (2–8). */
export const isSimple = (kind: TileKind): boolean => !isYaochu(kind);

const GREEN_KINDS = new Set<TileKind>([19, 20, 21, 23, 25, HATSU]); // 2s 3s 4s 6s 8s e Verde
export const isGreen = (kind: TileKind): boolean => GREEN_KINDS.has(kind);

export const YAOCHU_KINDS: readonly TileKind[] = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

/** Tipos removidos no sanma: 2m–8m. */
export const isRemovedInSanma = (kind: TileKind): boolean => kind >= 1 && kind <= 7;

export const kindsInMode = (mode: Mode): TileKind[] =>
  Array.from({ length: KIND_COUNT }, (_, k) => k).filter(
    (k) => mode === 'yonma' || !isRemovedInSanma(k),
  );

/** Dora indicada por um indicador (spec 7.1 e 7.13: no sanma, 1m⇄9m). */
export function doraFromIndicator(indicator: TileKind, mode: Mode): TileKind {
  if (isWind(indicator)) return indicator === NORTH ? EAST : indicator + 1;
  if (isDragon(indicator)) return indicator === CHUN ? HAKU : indicator + 1;
  if (mode === 'sanma' && suitOf(indicator) === 'm') return indicator === 0 ? 8 : 0;
  return numberOf(indicator) === 9 ? indicator - 8 : indicator + 1;
}

/** Quantas cópias de cada 5 são vermelhas para uma configuração de aka dora. */
export function redCopies(akaDora: number, mode: Mode): Readonly<Record<number, number>> {
  if (akaDora === 0) return {};
  if (mode === 'sanma') return { [FIVE_P]: 1, [FIVE_S]: 1 };
  if (akaDora === 4) return { [FIVE_M]: 1, [FIVE_P]: 2, [FIVE_S]: 1 };
  return { [FIVE_M]: 1, [FIVE_P]: 1, [FIVE_S]: 1 };
}

export function makeTile(id: number, reds: Readonly<Record<number, number>>): Tile {
  const kind = Math.floor(id / COPIES);
  const copy = id % COPIES;
  return { id, kind, red: copy < (reds[kind] ?? 0) };
}

/** Conjunto completo de peças físicas da modalidade (136 no yonma, 108 no sanma). */
export function buildTileSet(mode: Mode, akaDora: number): Tile[] {
  const reds = redCopies(akaDora, mode);
  const tiles: Tile[] = [];
  for (let id = 0; id < TOTAL_TILES; id++) {
    const kind = Math.floor(id / COPIES);
    if (mode === 'sanma' && isRemovedInSanma(kind)) continue;
    tiles.push(makeTile(id, reds));
  }
  return tiles;
}

/** Vetor de contagem por tipo (34 posições). */
export function toCounts(tiles: readonly { kind: TileKind }[]): number[] {
  const counts = new Array<number>(KIND_COUNT).fill(0);
  for (const t of tiles) counts[t.kind] = (counts[t.kind] ?? 0) + 1;
  return counts;
}

export function countsTotal(counts: readonly number[]): number {
  let n = 0;
  for (const c of counts) n += c;
  return n;
}

/** Ordenação da mão: por tipo, com o 5 vermelho antes do normal. */
export function compareTiles(a: Tile, b: Tile): number {
  return a.kind - b.kind || Number(b.red) - Number(a.red) || a.id - b.id;
}

export const sortTiles = (tiles: readonly Tile[]): Tile[] => [...tiles].sort(compareTiles);
