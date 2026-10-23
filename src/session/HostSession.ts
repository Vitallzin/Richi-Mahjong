/**
 * Sessão do anfitrião (spec 13.1): roda o motor como a sessão solo e, a cada mudança, publica para
 * cada convidado **apenas a sua** PlayerView (escrita atômica feita pelo transporte). Ações dos
 * convidados chegam pelo inbox, passam pelo motor e são idempotentes por clientSeq (13.4).
 * Convidado ausente ou parado é coberto por um bot até voltar (13.6, ADR 0020); quem entra com a
 * partida em andamento assume o lugar de um bot no começo da mão seguinte.
 */
import { eventsForSeat, getPlayerView, type GameEvent, type Seat } from '../engine';
import { LocalSession, type LocalSessionOptions } from './LocalSession';
import {
  NETWORK_GRACE_MS,
  ROOM_IDLE,
  type CoverReason,
  type HostUpdate,
  type InboxMessage,
  type PrivatePayload,
} from './room';
import type { MatchSnapshot } from './storage';
import type { SeatSetup } from './types';

export interface HostTransport {
  publish(update: HostUpdate): void;
}

/** Assentos da partida e quem está coberto por bot, a cada mudança (a sala grava no banco). */
export type SeatsListener = (
  seats: readonly SeatSetup[],
  covers: Readonly<Partial<Record<Seat, CoverReason>>>,
) => void;

export type HostSessionOptions = LocalSessionOptions & {
  readonly transport: HostTransport;
  readonly onSeats?: SeatsListener;
  /** Sorteio do bot que dá lugar a quem entra (padrão: crypto). */
  readonly pick?: (n: number) => number;
};

const securePick = (n: number): number =>
  (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % n;

export class HostSession extends LocalSession {
  override readonly source = 'room';
  private readonly transport: HostTransport;
  /** Começa no relógio: se o anfitrião recarregar, a numeração continua crescendo para os convidados. */
  private seq = Date.now();
  private readonly lastClientSeq = new Map<string, number>();
  private readonly lastError = new Map<string, string>();
  private readonly onSeats: SeatsListener | undefined;
  private readonly pick: (n: number) => number;
  /** Quem entrou com a partida em andamento, na ordem de chegada. */
  private readonly waiting = new Map<string, SeatSetup>();

  constructor(opts: HostSessionOptions) {
    super({ remoteGraceMs: NETWORK_GRACE_MS, idle: ROOM_IDLE, ...opts });
    this.transport = opts.transport;
    this.onSeats = opts.onSeats;
    this.pick = opts.pick ?? securePick;
  }

  static resumeRoom(
    snapshot: MatchSnapshot,
    extra: Omit<HostSessionOptions, 'state' | 'settings' | 'seats' | 'localSeat' | 'banks'>,
  ): HostSession {
    return new HostSession({ ...LocalSession.optionsFrom(snapshot, extra), ...extra });
  }

  /** Assento de um convidado pelo uid. */
  seatOf(uid: string): Seat | null {
    const i = this.seats.findIndex((s) => s.kind === 'human' && s.uid === uid);
    return i >= 0 ? (i as Seat) : null;
  }

  /** Mensagem do inbox de um convidado. Repetida (mesmo clientSeq) ou de quem não joga: ignorada. */
  receive(msg: InboxMessage): void {
    const seat = this.seatOf(msg.uid);
    if (seat === null || seat === this.localSeat) return;
    if (msg.clientSeq <= (this.lastClientSeq.get(msg.uid) ?? 0)) return;
    this.lastClientSeq.set(msg.uid, msg.clientSeq);
    try {
      this.lastError.delete(msg.uid);
      this.submitFor(seat, msg.action);
    } catch (e) {
      // Ação ilegal ou fora de hora: o estado não muda; o convidado recebe um erro leve.
      // Curto: as regras do banco limitam o tamanho e recusariam a publicação inteira.
      const message = e instanceof Error ? e.message : String(e);
      this.lastError.set(msg.uid, message.slice(0, 200));
      this.publish([]);
    }
  }

  /**
   * Presença de um convidado: ausente ⇒ bot assume; de volta ⇒ retoma na próxima decisão.
   * Quem estava parado (idle) e reconecta continua coberto até agir ou pedir para voltar.
   */
  setPresent(uid: string, present: boolean): void {
    const seat = this.seatOf(uid);
    if (seat === null || seat === this.localSeat) {
      if (!present) this.waiting.delete(uid);
      return;
    }
    if (!present) this.setCovered(seat, 'away');
    else if (this.coverOf(seat) === 'away') this.setCovered(seat, null);
  }

  /** "Voltar a jogar": tira o bot que cobria o jogador (convidado pelo uid ou o próprio anfitrião). */
  resume(uid?: string): void {
    const seat = uid === undefined ? this.localSeat : this.seatOf(uid);
    if (seat !== null) this.setCovered(seat, null);
  }

  /** Alguém entrou com a partida em andamento: assume um bot quando a mão atual terminar. */
  queueJoin(setup: SeatSetup): void {
    if (setup.kind !== 'human' || !setup.uid || this.seatOf(setup.uid) !== null) return;
    this.waiting.set(setup.uid, setup);
  }

  isWaiting(uid: string): boolean {
    return this.waiting.has(uid);
  }

  coveredSeats(): Seat[] {
    return this.seats.map((_, i) => i as Seat).filter((s) => this.isCovered(s));
  }

  /** Coberturas atuais por assento. */
  covers(): Partial<Record<Seat, CoverReason>> {
    const out: Partial<Record<Seat, CoverReason>> = {};
    for (const seat of this.coveredSeats()) {
      const reason = this.coverOf(seat);
      if (reason) out[seat] = reason;
    }
    return out;
  }

  /** Entre mãos: cada um que espera assume o lugar de um bot sorteado (se houver). */
  protected override beforeNextHand(): void {
    for (const [uid, setup] of this.waiting) {
      const bots = this.seats.flatMap((s, i) => (s.kind === 'bot' ? [i as Seat] : []));
      if (bots.length === 0) return;
      const seat = bots[this.pick(bots.length)] ?? bots[0];
      if (seat === undefined) return;
      this.waiting.delete(uid);
      this.replaceSeat(seat, setup);
    }
  }

  protected override onSeatsChange(): void {
    this.onSeats?.(this.seats, this.covers());
  }

  /** Sala não pausa por um jogador só (apresentação e janela de sair seguem com a mesa andando). */
  override setPaused(): void {
    // intencionalmente vazio
  }

  protected override onChange(events: readonly GameEvent[]): void {
    if (this.disposed) return;
    this.publish(events);
  }

  private publish(events: readonly GameEvent[]): void {
    this.seq += 1;
    const privates: Record<string, PrivatePayload> = {};
    this.seats.forEach((s, i) => {
      const seat = i as Seat;
      if (s.kind !== 'human' || !s.uid || seat === this.localSeat) return;
      const clock = this.clockFor(seat);
      privates[s.uid] = {
        seq: this.seq,
        view: JSON.stringify(getPlayerView(this.state, seat)),
        events: JSON.stringify(eventsForSeat(events, seat)),
        clock: clock
          ? { baseMs: clock.baseMs, bankMs: clock.bankMs, hasBank: clock.hasBank }
          : null,
        lastError: this.lastError.get(s.uid) ?? null,
      };
    });
    this.transport.publish({
      seq: this.seq,
      privates,
      public: {
        seq: this.seq,
        phase: this.state.phase,
        scores: this.state.scores,
        handsPlayed: this.state.handsPlayed,
      },
    });
  }
}
