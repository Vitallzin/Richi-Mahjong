/**
 * Sessão do anfitrião (spec 13.1): roda o motor como a sessão solo e, a cada mudança, publica para
 * cada convidado **apenas a sua** PlayerView (escrita atômica feita pelo transporte). Ações dos
 * convidados chegam pelo inbox, passam pelo motor e são idempotentes por clientSeq (13.4).
 * Convidado ausente é coberto por um bot até voltar (13.6).
 */
import { eventsForSeat, getPlayerView, type GameEvent, type Seat } from '../engine';
import { LocalSession, type LocalSessionOptions } from './LocalSession';
import { NETWORK_GRACE_MS, type HostUpdate, type InboxMessage, type PrivatePayload } from './room';
import type { MatchSnapshot } from './storage';

export interface HostTransport {
  publish(update: HostUpdate): void;
}

export type HostSessionOptions = LocalSessionOptions & { readonly transport: HostTransport };

export class HostSession extends LocalSession {
  override readonly source = 'room';
  private readonly transport: HostTransport;
  /** Começa no relógio: se o anfitrião recarregar, a numeração continua crescendo para os convidados. */
  private seq = Date.now();
  private readonly lastClientSeq = new Map<string, number>();
  private readonly lastError = new Map<string, string>();

  constructor(opts: HostSessionOptions) {
    super({ remoteGraceMs: NETWORK_GRACE_MS, ...opts });
    this.transport = opts.transport;
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

  /** Presença de um convidado: ausente ⇒ bot assume; de volta ⇒ retoma na próxima decisão. */
  setPresent(uid: string, present: boolean): void {
    const seat = this.seatOf(uid);
    if (seat === null || seat === this.localSeat) return;
    this.setCovered(seat, !present);
  }

  coveredSeats(): Seat[] {
    return this.seats.map((_, i) => i as Seat).filter((s) => this.isCovered(s));
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
