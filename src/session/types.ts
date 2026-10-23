/** Interface única entre a UI e o jogo (spec 5.4): local, anfitrião ou convidado. */
import type { BotSkill, CharacterId } from '../bots';
import type { Action, PlayerEvent, PlayerView, RuleSet, Seat, Tile } from '../engine';
import type { TimerSettings } from './clock';
import type { LoggedWin } from './history';

export type SeatSetup =
  | {
      readonly kind: 'human';
      readonly name: string;
      /** Conta do jogador em sala (spec 13): para quem vai a visão privada. */
      readonly uid?: string;
      readonly avatar?: string;
      /** Foto da conta Google (salas): mostrada no lugar do avatar quando ele é "google". */
      readonly photoURL?: string;
    }
  | { readonly kind: 'bot'; readonly skill: BotSkill; readonly characterId: CharacterId };

/** Configurações fora do motor (spec 6.3): tempo, adversários, treino. */
export interface MatchSettings {
  readonly timer: TimerSettings;
  /** Modo treino "Mostrar mãos" (Fase 3). */
  readonly training: boolean;
}

export interface ClockView {
  readonly seat: Seat;
  readonly baseMs: number;
  readonly bankMs: number;
  readonly hasBank: boolean;
  /** Momento (relógio da sessão) em que a leitura foi feita. */
  readonly at: number;
}

export type SessionListener = (view: PlayerView, events: readonly PlayerEvent[]) => void;

export interface MatchSession {
  readonly rules: RuleSet;
  readonly settings: MatchSettings;
  readonly seats: readonly SeatSetup[];
  readonly localSeat: Seat;
  /** Partida solo contra bots ou em sala com amigos (histórico, spec 12.4). */
  readonly source: 'solo' | 'room';
  getView(): PlayerView;
  subscribe(listener: SessionListener): () => void;
  submit(action: Action): void;
  /** Relógio do jogador local quando ele está decidindo (null se não está ou se é ilimitado). */
  getClock(): ClockView | null;
  /**
   * Modo treino (spec 9.7): mãos de todos, só na sessão local com a opção ligada; senão null.
   * Usado apenas pela apresentação — nunca por bots ou ajudas.
   */
  getRevealedHands(): Readonly<Partial<Record<Seat, readonly Tile[]>>> | null;
  /**
   * Pausa a partida (ex.: janela de sair aberta): o relógio congela e ninguém age até retomar.
   * Numa sala online o anfitrião decide; a sessão local sempre aceita.
   */
  setPaused(paused: boolean): void;
  /** Vitórias registradas nesta partida (para o histórico, spec 12.4). */
  getWinLog(): readonly LoggedWin[];
  dispose(): void;
}
