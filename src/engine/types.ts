/** Tipos compartilhados do motor. */
import type { Tile, TileKind } from './tiles';

/** Assento físico: 0 = assento inicial do Leste (spec 5.2). No sanma vai de 0 a 2. */
export type Seat = 0 | 1 | 2 | 3;

export const asSeat = (n: number): Seat => {
  if (n !== 0 && n !== 1 && n !== 2 && n !== 3) throw new RangeError(`Assento inválido: ${n}`);
  return n;
};

/** Grupos expostos ou declarados (spec 5.2). `tiles` inclui todas as peças do grupo. */
export type Meld =
  | {
      readonly type: 'chi';
      readonly tiles: readonly Tile[];
      readonly called: Tile;
      readonly from: Seat;
    }
  | {
      readonly type: 'pon';
      readonly tiles: readonly Tile[];
      readonly called: Tile;
      readonly from: Seat;
    }
  | {
      readonly type: 'daiminkan';
      readonly tiles: readonly Tile[];
      readonly called: Tile;
      readonly from: Seat;
    }
  | {
      readonly type: 'kakan';
      readonly tiles: readonly Tile[];
      readonly called: Tile;
      readonly added: Tile;
      readonly from: Seat;
    }
  | { readonly type: 'ankan'; readonly tiles: readonly Tile[] };

/** Tipo base de um grupo (para chi, a menor peça da sequência). */
export const meldKind = (meld: Meld): TileKind => Math.min(...meld.tiles.map((t) => t.kind));

export const isOpenMeld = (meld: Meld): boolean => meld.type !== 'ankan';
export const isKanMeld = (meld: Meld): boolean =>
  meld.type === 'daiminkan' || meld.type === 'kakan' || meld.type === 'ankan';
