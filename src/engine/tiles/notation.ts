/**
 * Notação textual das peças (spec 7.1): `1m…9m`, `1p…9p`, `1s…9s`, `1z…7z`; cincos vermelhos `0m/0p/0s`.
 * Exemplo: `"123m406p789s11z"` (o `0p` é o 5p vermelho).
 */
import { COPIES, KIND_COUNT, suitOf, numberOf, type Suit, type Tile, type TileKind } from './tile';

const SUIT_OFFSET: Readonly<Record<Suit, number>> = { m: 0, p: 9, s: 18, z: 27 };

export class NotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotationError';
  }
}

type ParsedToken = { kind: TileKind; red: boolean };

function parseTokens(text: string): ParsedToken[] {
  const out: ParsedToken[] = [];
  let digits: number[] = [];
  for (const ch of text.replace(/\s+/g, '')) {
    if (ch >= '0' && ch <= '9') {
      digits.push(Number(ch));
      continue;
    }
    if (!(ch in SUIT_OFFSET)) throw new NotationError(`Caractere inválido na notação: "${ch}"`);
    if (digits.length === 0) throw new NotationError(`Naipe "${ch}" sem números`);
    const suit = ch as Suit;
    for (const d of digits) {
      const red = d === 0;
      const n = red ? 5 : d;
      if (suit === 'z' && (red || n > 7)) throw new NotationError(`Honra inválida: ${d}z`);
      out.push({ kind: SUIT_OFFSET[suit] + n - 1, red });
    }
    digits = [];
  }
  if (digits.length > 0) throw new NotationError('Números sem naipe no fim da notação');
  return out;
}

/** Converte notação em tipos (o 5 vermelho vira o tipo 5 normal). */
export function parseKinds(text: string): TileKind[] {
  return parseTokens(text).map((t) => t.kind);
}

/** Vetor de contagem por tipo a partir da notação. */
export function parseCounts(text: string): number[] {
  const counts = new Array<number>(KIND_COUNT).fill(0);
  for (const k of parseKinds(text)) counts[k] = (counts[k] ?? 0) + 1;
  return counts;
}

/**
 * Converte notação em peças físicas com ids únicos. O vermelho usa a cópia 0; os normais usam as
 * cópias seguintes. `used` permite continuar a alocação entre várias chamadas (ex.: mão + chamadas).
 */
export function parseTiles(text: string, used: Set<number> = new Set()): Tile[] {
  return parseTokens(text).map(({ kind, red }) => {
    const order = red ? [0] : [1, 2, 3, 0];
    for (const copy of order) {
      const id = kind * COPIES + copy;
      if (!used.has(id)) {
        used.add(id);
        return { id, kind, red };
      }
    }
    throw new NotationError(`Mais de 4 cópias de ${kindToString(kind)}`);
  });
}

export function kindToString(kind: TileKind): string {
  return `${numberOf(kind)}${suitOf(kind)}`;
}

export function tileToString(tile: Tile): string {
  return tile.red ? `0${suitOf(tile.kind)}` : kindToString(tile.kind);
}

/** Formata peças de forma compacta: `[1m,2m,3m,0p]` ⇒ `"123m0p"`. Mantém a ordem recebida. */
export function formatTiles(tiles: readonly Tile[]): string {
  let out = '';
  let pendingDigits = '';
  let pendingSuit: Suit | null = null;
  for (const t of tiles) {
    const suit = suitOf(t.kind);
    if (pendingSuit !== null && suit !== pendingSuit) {
      out += pendingDigits + pendingSuit;
      pendingDigits = '';
    }
    pendingSuit = suit;
    pendingDigits += t.red ? '0' : String(numberOf(t.kind));
  }
  return pendingSuit === null ? out : out + pendingDigits + pendingSuit;
}

/** Formata um vetor de contagem em notação ordenada. */
export function formatCounts(counts: readonly number[]): string {
  const tiles: Tile[] = [];
  counts.forEach((c, kind) => {
    for (let i = 0; i < c; i++) tiles.push({ id: -1, kind, red: false });
  });
  return formatTiles(tiles);
}
