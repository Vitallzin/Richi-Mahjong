/**
 * Sessão do convidado (spec 13.1): não roda motor. Renderiza a PlayerView que o anfitrião publica em
 * private/{uid} e envia ações pelo inbox. O relógio é contado a partir do recebimento.
 */
import type { Action, PlayerEvent, PlayerView, RuleSet, Seat, Tile } from '../engine';
import { consume } from './clock';
import { winsFromEvents, type LoggedWin } from './history';
import type { PrivatePayload } from './room';
import type { ClockView, MatchSession, MatchSettings, SeatSetup, SessionListener } from './types';

export interface GuestTransport {
  /** Recebe cada publicação do anfitrião; devolve a função para parar. */
  onPrivate(cb: (payload: PrivatePayload) => void): () => void;
  send(action: Action, clientSeq: number): void;
}

export interface GuestSessionOptions {
  readonly rules: RuleSet;
  readonly settings: MatchSettings;
  readonly seats: readonly SeatSetup[];
  readonly localSeat: Seat;
  readonly transport: GuestTransport;
  /** Primeira visão já recebida (a mesa só abre com uma visão). */
  readonly initial: PrivatePayload;
  readonly now?: () => number;
}

export class GuestSession implements MatchSession {
  readonly rules: RuleSet;
  readonly settings: MatchSettings;
  readonly localSeat: Seat;
  readonly source = 'room';

  private seatList: readonly SeatSetup[];
  private view: PlayerView;
  private seq: number;
  private clock: {
    readonly baseMs: number;
    readonly bankMs: number;
    readonly hasBank: boolean;
    readonly at: number;
  } | null;
  private clientSeq: number;
  private lastError: string | null;
  private readonly listeners = new Set<SessionListener>();
  private readonly winLog: LoggedWin[] = [];
  private readonly transport: GuestTransport;
  private readonly now: () => number;
  private readonly stop: () => void;

  constructor(opts: GuestSessionOptions) {
    this.rules = opts.rules;
    this.settings = opts.settings;
    this.seatList = opts.seats;
    this.localSeat = opts.localSeat;
    this.transport = opts.transport;
    this.now = opts.now ?? (() => performance.now());
    this.view = JSON.parse(opts.initial.view) as PlayerView;
    this.seq = opts.initial.seq;
    this.clock = opts.initial.clock ? { ...opts.initial.clock, at: this.now() } : null;
    this.lastError = opts.initial.lastError ?? null;
    // Reconexão no meio da partida: continua a numeração a partir do tempo (nunca repete).
    this.clientSeq = Date.now();
    this.stop = this.transport.onPrivate((p) => this.receive(p));
  }

  private receive(p: PrivatePayload): void {
    if (p.seq <= this.seq) return;
    this.seq = p.seq;
    this.view = JSON.parse(p.view) as PlayerView;
    const events = JSON.parse(p.events) as PlayerEvent[];
    this.clock = p.clock ? { ...p.clock, at: this.now() } : null;
    this.lastError = p.lastError ?? null;
    if (this.view.summary) this.winLog.push(...winsFromEvents(events, this.view.summary));
    for (const l of this.listeners) l(this.view, events);
  }

  get seats(): readonly SeatSetup[] {
    return this.seatList;
  }

  /** Assentos mudaram no banco (alguém entrou no lugar de um bot entre mãos). */
  setSeats(seats: readonly SeatSetup[]): void {
    if (seats.length === this.seatList.length) this.seatList = seats;
  }

  getView(): PlayerView {
    return this.view;
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  submit(action: Action): void {
    this.clientSeq += 1;
    this.transport.send(action, this.clientSeq);
  }

  getClock(): ClockView | null {
    const c = this.clock;
    if (!c) return null;
    const now = this.now();
    const r = consume(c.baseMs, c.bankMs, now - c.at);
    return {
      seat: this.localSeat,
      baseMs: r.baseMs,
      bankMs: r.bankMs,
      hasBank: c.hasBank,
      at: now,
    };
  }

  /** Último erro devolvido pelo anfitrião (ação recusada), para avisar o jogador. */
  getLastError(): string | null {
    return this.lastError;
  }

  getRevealedHands(): Readonly<Partial<Record<Seat, readonly Tile[]>>> | null {
    return null;
  }

  setPaused(): void {
    // O convidado não pausa a sala.
  }

  getWinLog(): readonly LoggedWin[] {
    return this.winLog;
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }
}
