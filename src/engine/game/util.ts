/** Utilitários internos do fluxo de jogo. */
import { isAgari, waits as computeWaits } from '../hand';
import { meetsHanMinimum, scoreHand, type ScoredHand } from '../scoring';
import { EAST, toCounts, type Tile, type TileKind } from '../tiles';
import { isOpenMeld, type Seat } from '../types';
import type { WinInput } from '../yaku';
import type { HandState, MatchState, PlayerState } from './types';

export const playerCount = (s: MatchState): number => s.rules.players;

export const nextSeat = (seat: Seat, n: number): Seat => ((seat + 1) % n) as Seat;

export const allSeats = (n: number): Seat[] => Array.from({ length: n }, (_, i) => i as Seat);

/** Assentos a partir do seguinte a `from`, na ordem de turno (exclui `from`). */
export const seatsAfter = (from: Seat, n: number): Seat[] =>
  Array.from({ length: n - 1 }, (_, i) => ((from + 1 + i) % n) as Seat);

export const seatWindKind = (s: MatchState, seat: Seat): TileKind =>
  EAST + ((seat - s.dealer + playerCount(s)) % playerCount(s));

export const roundWindKind = (s: MatchState): TileKind => EAST + s.roundWind;

/** Número da mão dentro do vento (Leste 1 = 1). */
export const handNumber = (s: MatchState): number => s.dealer + 1;

export function requireHand(s: MatchState): HandState {
  if (!s.hand) throw new Error('Não há mão em andamento');
  return s.hand;
}

export function playerOf(h: HandState, seat: Seat): PlayerState {
  const p = h.players[seat];
  if (!p) throw new Error(`Assento sem jogador: ${seat}`);
  return p;
}

export const isClosedHand = (p: PlayerState): boolean => !p.melds.some(isOpenMeld);

export const revealedDora = (h: HandState): Tile[] => h.doraIndicators.slice(0, h.doraRevealed);

export const kanCount = (h: HandState): number => h.kanSeats.length;

export function removeTileById(tiles: Tile[], id: number): Tile {
  const index = tiles.findIndex((t) => t.id === id);
  if (index < 0) throw new Error(`Peça ${id} não está na mão`);
  return tiles.splice(index, 1)[0] as Tile;
}

/** Esperas da mão fechada de 13 peças (3n+1). */
export const handWaits = (p: PlayerState): TileKind[] =>
  computeWaits(toCounts(p.hand), p.melds.length);

/** Furiten permanente, temporário ou de riichi. */
export function isFuriten(p: PlayerState): boolean {
  if (p.furiten.temporary || p.furiten.riichi) return true;
  const discarded = new Set(p.discards.map((d) => d.tile.kind));
  return handWaits(p).some((k) => discarded.has(k));
}

export interface WinFlags {
  readonly winType: 'ron' | 'tsumo';
  readonly haitei?: boolean;
  readonly houtei?: boolean;
  readonly rinshan?: boolean;
  readonly chankan?: boolean;
  readonly tenhou?: boolean;
  readonly chiihou?: boolean;
}

/** Monta a entrada de pontuação de um jogador com a mão fechada `concealed` (já com a peça vencedora). */
export function buildWinInput(
  s: MatchState,
  seat: Seat,
  concealed: readonly Tile[],
  winTile: Tile,
  flags: WinFlags,
): WinInput {
  const h = requireHand(s);
  const p = playerOf(h, seat);
  const riichi = p.riichi?.established ? (p.riichi.double ? 'double' : 'riichi') : 'none';
  return {
    winType: flags.winType,
    seatWind: seatWindKind(s, seat),
    roundWind: roundWindKind(s),
    isDealer: seat === s.dealer,
    riichi,
    ippatsu: riichi !== 'none' && (p.riichi?.ippatsu ?? false),
    haitei: flags.haitei ?? false,
    houtei: flags.houtei ?? false,
    rinshan: flags.rinshan ?? false,
    chankan: flags.chankan ?? false,
    tenhou: flags.tenhou ?? false,
    chiihou: flags.chiihou ?? false,
    concealed,
    melds: p.melds,
    winTile,
    doraIndicators: revealedDora(h).map((t) => t.kind),
    uraIndicators: h.uraIndicators.slice(0, h.doraRevealed).map((t) => t.kind),
    kitaCount: p.kita.length,
    rules: s.rules,
  };
}

/** Pontuação da vitória se ela for válida (forma + yaku + han mínimo), senão null. */
export function evaluateWin(
  s: MatchState,
  seat: Seat,
  concealed: readonly Tile[],
  winTile: Tile,
  flags: WinFlags,
): ScoredHand | null {
  const melds = playerOf(requireHand(s), seat).melds;
  if (!isAgari(toCounts(concealed), melds.length)) return null;
  const scored = scoreHand(buildWinInput(s, seat, concealed, winTile, flags));
  return scored && meetsHanMinimum(scored, s.rules.hanMinimum) ? scored : null;
}

/** Bandeiras de situação para um tsumo do jogador da vez. */
export function tsumoFlags(s: MatchState, seat: Seat): WinFlags {
  const h = requireHand(s);
  const p = playerOf(h, seat);
  const firstDraw = h.uninterrupted && p.discards.length === 0 && h.turnKind === 'draw';
  return {
    winType: 'tsumo',
    haitei: h.turnKind === 'draw' && h.wall.length === 0,
    rinshan: h.turnKind === 'rinshan',
    tenhou: firstDraw && seat === s.dealer,
    chiihou: firstDraw && seat !== s.dealer,
  };
}
