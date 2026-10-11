/**
 * Construtores para testes do motor (não usados em produção).
 * Ex.: `winInput('123m456p789s23455s', '5s', { melds: ['pon:777z'] })`.
 */
import { PRESET_YONMA } from '../rules';
import { EAST, parseKinds, parseTiles, SOUTH, type Tile } from '../tiles';
import type { Meld, Seat } from '../types';
import type { WinInput } from '../yaku';

/**
 * Cria um grupo a partir de `tipo:notação`: `chi:123m` (a 1ª peça é a chamada), `pon:555p`,
 * `kan:1111z` (daiminkan), `kakan:2222z`, `ankan:9999s`.
 */
export function makeMeld(spec: string, used: Set<number>, from: Seat = 3): Meld {
  const [type, notation] = spec.split(':');
  if (!type || !notation) throw new Error(`Grupo inválido: ${spec}`);
  const tiles = parseTiles(notation, used);
  const first = tiles[0] as Tile;
  switch (type) {
    case 'chi':
      return { type: 'chi', tiles, called: first, from };
    case 'pon':
      return { type: 'pon', tiles, called: first, from };
    case 'kan':
      return { type: 'daiminkan', tiles, called: first, from };
    case 'kakan':
      return { type: 'kakan', tiles, called: first, added: tiles[3] as Tile, from };
    case 'ankan':
      return { type: 'ankan', tiles };
    default:
      throw new Error(`Tipo de grupo desconhecido: ${type}`);
  }
}

export type WinOptions = Partial<Omit<WinInput, 'concealed' | 'melds' | 'winTile'>> & {
  readonly melds?: readonly string[];
};

/** Monta a entrada de pontuação. `hand` inclui a peça vencedora `winTile`. */
export function winInput(hand: string, winTile: string, options: WinOptions = {}): WinInput {
  const used = new Set<number>();
  const { melds: meldSpecs = [], ...rest } = options;
  const melds = meldSpecs.map((m) => makeMeld(m, used));
  const concealed = parseTiles(hand, used);
  const [winKind] = parseKinds(winTile);
  const wantRed = winTile.startsWith('0');
  const win = [...concealed].reverse().find((t) => t.kind === winKind && t.red === wantRed);
  if (!win) throw new Error(`Peça vencedora ${winTile} não está na mão ${hand}`);
  return {
    winType: 'ron',
    seatWind: SOUTH,
    roundWind: EAST,
    isDealer: false,
    riichi: 'none',
    ippatsu: false,
    haitei: false,
    houtei: false,
    rinshan: false,
    chankan: false,
    tenhou: false,
    chiihou: false,
    doraIndicators: [],
    uraIndicators: [],
    kitaCount: 0,
    rules: PRESET_YONMA,
    ...rest,
    concealed,
    melds,
    winTile: win,
  };
}
