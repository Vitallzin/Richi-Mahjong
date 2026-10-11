/**
 * Estado, ações, eventos e resultado de mão (spec 5.2). Todo o estado é serializável em JSON.
 */
import type { RuleSet } from '../rules';
import type { ScoredHand } from '../scoring';
import type { Tile, TileKind } from '../tiles';
import type { Meld, Seat } from '../types';

export type Phase =
  | 'awaitingDiscard' // jogador da vez comprou (ou chamou) e deve agir
  | 'awaitingCalls' // alguém descartou; assentos elegíveis respondem
  | 'awaitingRobbery' // kakan/ankan/kita abertos a ron
  | 'handSummary' // mão encerrada, mostrando resultado
  | 'matchEnded';

export type Action =
  | { readonly type: 'discard'; readonly tile: Tile; readonly riichi?: boolean }
  | { readonly type: 'tsumo' }
  | { readonly type: 'ron' }
  | { readonly type: 'chi'; readonly use: readonly [Tile, Tile] }
  | { readonly type: 'pon'; readonly use: readonly [Tile, Tile] }
  | { readonly type: 'daiminkan' }
  | { readonly type: 'ankan'; readonly kind: TileKind }
  | { readonly type: 'kakan'; readonly tile: Tile }
  | { readonly type: 'kita' }
  | { readonly type: 'kyuushuKyuuhai' }
  | { readonly type: 'pass' }
  | { readonly type: 'ackSummary' };

export type ActionType = Action['type'];

export interface DiscardEntry {
  readonly tile: Tile;
  /** Descartou a peça que acabou de comprar. */
  readonly tsumogiri: boolean;
  /** Peça da declaração de riichi (exibida girada). */
  readonly riichi: boolean;
  /** Quem chamou esta peça (ela sai do rio na exibição, mas conta para furiten). */
  calledBy: Seat | null;
}

export interface RiichiState {
  readonly double: boolean;
  /** Índice do descarte de declaração. */
  readonly discardIndex: number;
  /** Estabelecido: o descarte de declaração não foi vencido por ron e o bastão foi pago. */
  established: boolean;
  ippatsu: boolean;
}

export interface PlayerState {
  /** Peças fechadas (inclui a peça recém-comprada). */
  hand: Tile[];
  /** Peça recém-comprada (null após chamada ou descarte). */
  drawn: Tile | null;
  melds: Meld[];
  discards: DiscardEntry[];
  kita: Tile[];
  riichi: RiichiState | null;
  furiten: { temporary: boolean; riichi: boolean };
  /** Responsáveis por pao (quem deu a peça que completou o yakuman). */
  pao: { daisangen: Seat | null; daisuushii: Seat | null };
}

export type CallResponse =
  | { readonly type: 'ron' }
  | { readonly type: 'pon'; readonly use: readonly [Tile, Tile] }
  | { readonly type: 'chi'; readonly use: readonly [Tile, Tile] }
  | { readonly type: 'daiminkan' }
  | { readonly type: 'pass' };

export interface CallOptions {
  readonly ron: boolean;
  readonly pon: readonly (readonly [Tile, Tile])[];
  readonly chi: readonly (readonly [Tile, Tile])[];
  readonly daiminkan: boolean;
}

export interface PendingCalls {
  readonly discarder: Seat;
  readonly tile: Tile;
  /** Opções por assento elegível (assentos sem opção não aparecem). */
  readonly options: Partial<Record<Seat, CallOptions>>;
  responses: Partial<Record<Seat, CallResponse>>;
}

export type RobberyKind = 'kakan' | 'ankan' | 'kita';

export interface PendingRobbery {
  readonly declarer: Seat;
  readonly kind: RobberyKind;
  readonly tile: Tile;
  readonly eligible: readonly Seat[];
  responses: Partial<Record<Seat, 'ron' | 'pass'>>;
}

export type TurnKind = 'draw' | 'call' | 'rinshan';

export interface HandState {
  readonly seed: number;
  /** Muro vivo: compra pela frente; o fim abastece o muro morto após kan/kita. */
  wall: Tile[];
  /** Peças de reposição do muro morto (compra pela frente). */
  replacements: Tile[];
  readonly doraIndicators: readonly Tile[];
  readonly uraIndicators: readonly Tile[];
  doraRevealed: number;
  /** Kan-dora a revelar após o próximo descarte (daiminkan/kakan). */
  pendingDora: number;
  players: PlayerState[];
  turn: Seat;
  turnKind: TurnKind;
  /** Kuikae: tipos que o jogador da vez não pode descartar após chi/pon. */
  forbiddenDiscards: TileKind[];
  /** Nenhuma chamada (chi/pon/kan/kita) aconteceu na mão até agora. */
  uninterrupted: boolean;
  kanSeats: Seat[];
  /** 4 kans de jogadores diferentes: empate abortivo após o próximo descarte sem ron. */
  suukaikanPending: boolean;
  pendingCalls: PendingCalls | null;
  pendingRobbery: PendingRobbery | null;
}

export type AbortiveReason = 'kyuushuKyuuhai' | 'suufonRenda' | 'suukaikan' | 'suuchaRiichi';

export interface WinRecord {
  readonly seat: Seat;
  /** Quem pagou o ron (null no tsumo). */
  readonly from: Seat | null;
  readonly winType: 'ron' | 'tsumo';
  readonly scored: ScoredHand;
  readonly hand: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly winTile: Tile;
  readonly pao: Seat | null;
  readonly deltas: readonly number[];
}

export interface HandSummary {
  readonly kind: 'win' | 'exhaustive' | 'abortive';
  readonly roundWind: TileKind;
  readonly handNumber: number;
  readonly honba: number;
  readonly wins: readonly WinRecord[];
  readonly abortiveReason: AbortiveReason | null;
  /** Empate por exaustão: quem estava tenpai. */
  readonly tenpai: readonly boolean[] | null;
  /** Mãos reveladas no resumo: vencedores e jogadores tenpai no empate. */
  readonly revealed: Partial<Record<Seat, readonly Tile[]>>;
  readonly nagashi: readonly Seat[];
  readonly doraIndicators: readonly Tile[];
  /** Só revelados quando um vencedor estava em riichi. */
  readonly uraIndicators: readonly Tile[];
  readonly deltas: readonly number[];
  readonly scoresBefore: readonly number[];
  readonly scoresAfter: readonly number[];
  readonly renchan: boolean;
  readonly matchEnds: boolean;
}

export type EndReason = 'normal' | 'tobi' | 'agariYame';

export interface MatchResult {
  /** Assentos do 1º ao último (desempate: Leste inicial > Sul > Oeste > Norte). */
  readonly ranking: readonly Seat[];
  readonly finalScores: readonly number[];
  readonly endReason: EndReason;
}

export interface MatchState {
  readonly schemaVersion: 1;
  readonly rules: RuleSet;
  scores: number[];
  /** 0 = Leste, 1 = Sul, 2 = Oeste. */
  roundWind: number;
  dealer: Seat;
  honba: number;
  riichiSticks: number;
  phase: Phase;
  hand: HandState | null;
  summary: HandSummary | null;
  /** Confirmação do resumo por assento (fase handSummary). */
  acks: boolean[];
  handsPlayed: number;
  result: MatchResult | null;
}

export interface LegalActions {
  readonly discard: readonly Tile[];
  /** Descartes que permitem declarar riichi. */
  readonly riichi: readonly Tile[];
  readonly tsumo: boolean;
  readonly ron: boolean;
  readonly chi: readonly (readonly [Tile, Tile])[];
  readonly pon: readonly (readonly [Tile, Tile])[];
  readonly daiminkan: boolean;
  readonly ankan: readonly TileKind[];
  readonly kakan: readonly Tile[];
  readonly kita: boolean;
  readonly kyuushuKyuuhai: boolean;
  readonly pass: boolean;
  readonly ackSummary: boolean;
}

export type GameEvent =
  | {
      readonly type: 'HandStarted';
      readonly roundWind: TileKind;
      readonly handNumber: number;
      readonly dealer: Seat;
      readonly honba: number;
    }
  | {
      readonly type: 'TileDrawn';
      readonly seat: Seat;
      readonly tile: Tile;
      readonly rinshan: boolean;
    }
  | {
      readonly type: 'TileDiscarded';
      readonly seat: Seat;
      readonly tile: Tile;
      readonly tsumogiri: boolean;
      readonly riichi: boolean;
    }
  | { readonly type: 'RiichiDeclared'; readonly seat: Seat }
  | { readonly type: 'CallMade'; readonly seat: Seat; readonly meld: Meld }
  | { readonly type: 'KitaDeclared'; readonly seat: Seat; readonly tile: Tile }
  | { readonly type: 'DoraRevealed'; readonly indicator: Tile }
  | { readonly type: 'HandWon'; readonly wins: readonly WinRecord[] }
  | {
      readonly type: 'ExhaustiveDraw';
      readonly tenpai: readonly boolean[];
      readonly nagashi: readonly Seat[];
    }
  | { readonly type: 'AbortiveDraw'; readonly reason: AbortiveReason }
  | { readonly type: 'MatchEnded'; readonly result: MatchResult };
