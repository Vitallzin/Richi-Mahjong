/**
 * Controlador de uma sala (spec 13.2): lobby, início, retomada do anfitrião, presença e a sessão de
 * jogo (HostSession no anfitrião, GuestSession nos convidados). Fala com o Firebase só por
 * net/room (carregado sob demanda). A interface lê o estado com subscribe/getState.
 *
 * ADR 0020: quem sai ou fica parado é coberto por um bot (marcado em seats/cover, com aviso na mesa);
 * quem entra com a partida em andamento assume um bot no começo da mão seguinte; ao fim da partida
 * todos voltam à sala.
 */
import type { BotSkill, CharacterId } from '../bots';
import { workerBotRunner } from '../bots/workerClient';
import type { PlayerView, RuleSet, Seat } from '../engine';
import {
  GuestSession,
  HostSession,
  humanSetup,
  loadMatch,
  PROTOCOL_VERSION,
  roomSeatOf,
  seatsForMatch,
  type CoverReason,
  type MatchSession,
  type MatchSettings,
  type PrivatePayload,
  type RoomMember,
  type RoomMeta,
  type RoomSeat,
  type SeatsListener,
} from '../session';
import { forgetActiveRoom, rememberActiveRoom } from './activeRoom';
import { resolveCharacters } from './match';
import type { CharacterChoice } from './settings';

/** Configuração da sala (meta.settings): o que a partida solo tem + adversários bots. */
export interface RoomSettings extends MatchSettings {
  readonly difficulty: BotSkill;
  readonly characters: readonly CharacterChoice[];
}

export type RoomPhase =
  'loading' | 'notFound' | 'outdated' | 'closed' | 'lobby' | 'starting' | 'playing' | 'error';

/** Aviso curto na mesa: alguém saiu, ficou parado, voltou ou entrou no lugar de um bot. */
export interface RoomNotice {
  readonly id: number;
  readonly kind: CoverReason | 'back' | 'joined';
  readonly name: string;
}

export interface RoomState {
  readonly phase: RoomPhase;
  readonly meta: RoomMeta | null;
  readonly seats: readonly RoomSeat[];
  /** Quem entrou na sala (sentado ou não), por uid. */
  readonly members: Readonly<Record<string, RoomMember>>;
  readonly online: ReadonlySet<string>;
  readonly isHost: boolean;
  readonly mySeat: number | null;
  readonly session: MatchSession | null;
  readonly notices: readonly RoomNotice[];
  readonly error: string | null;
}

export interface Me extends RoomMember {
  readonly uid: string;
}

const net = () => import('../net/room');
type Net = Awaited<ReturnType<typeof net>>;
const saveKeyOf = (code: string) => `match:room:${code}`;
/** Quanto tempo cada aviso fica na mesa. */
const NOTICE_MS = 6000;

const withoutCover = (s: RoomSeat): RoomSeat => {
  if (!s.cover) return s;
  const { cover: _, ...rest } = s;
  return rest;
};

/** A partida desta sessão já terminou (o resultado final está na tela)? */
const ended = (session: MatchSession | null): boolean => session?.getView().phase === 'matchEnded';

export class RoomController {
  private state: RoomState = {
    phase: 'loading',
    meta: null,
    seats: [],
    members: {},
    online: new Set(),
    isHost: false,
    mySeat: null,
    session: null,
    notices: [],
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private readonly stops: (() => void)[] = [];
  private stopPrivate: (() => void) | null = null;
  private host: HostSession | null = null;
  private guest: GuestSession | null = null;
  private readonly guestListeners = new Set<(p: PrivatePayload) => void>();
  /** Visão recebida antes de o convidado aparecer sentado (entrada no meio da partida). */
  private pendingPayload: PrivatePayload | null = null;
  private noticeSeq = 0;
  private disposed = false;
  /** Cada start/dispose troca a geração: passos assíncronos de uma geração antiga são ignorados. */
  private generation = 0;

  constructor(
    readonly code: string,
    private readonly me: Me,
  ) {}

  getState = (): RoomState => this.state;

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(patch: Partial<RoomState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private get profile(): RoomMember {
    return {
      displayName: this.me.displayName,
      avatar: this.me.avatar,
      ...(this.me.photoURL ? { photoURL: this.me.photoURL } : {}),
    };
  }

  /** Pode ser chamado de novo depois de dispose (o modo estrito do React monta efeitos duas vezes). */
  async start(): Promise<void> {
    this.disposed = false;
    const gen = ++this.generation;
    const alive = () => gen === this.generation && !this.disposed;
    try {
      const n = await net();
      const meta = await n.readMeta(this.code);
      if (!alive()) return;
      if (!meta) {
        forgetActiveRoom(this.code);
        return this.set({ phase: 'notFound' });
      }
      if (meta.protocolVersion !== PROTOCOL_VERSION) return this.set({ phase: 'outdated', meta });
      const isHost = meta.hostUid === this.me.uid;
      try {
        await n.joinRoom(this.code, this.me.uid, this.profile);
      } catch {
        // Sala expirada: só quem já é membro ainda lê; os outros veem "sala encerrada".
        const reading = await new Promise<boolean>((resolve) => {
          const stop = n.watchSeats(this.code, () => resolve(true));
          setTimeout(() => resolve(false), 3000);
          this.stops.push(stop);
        });
        if (!reading) {
          forgetActiveRoom(this.code);
          return this.set({ phase: 'closed', meta });
        }
      }
      if (!alive()) return;
      rememberActiveRoom(this.code);
      this.set({ meta, isHost, phase: meta.status === 'playing' ? 'starting' : 'lobby' });
      this.stops.push(n.trackPresence(this.code, this.me.uid));
      this.stops.push(
        n.watchMeta(this.code, (m) => {
          if (!m) {
            this.endSession();
            forgetActiveRoom(this.code);
            return this.set({ phase: 'closed', meta: null });
          }
          this.set({ meta: m });
          this.onStatus(m);
        }),
      );
      this.stops.push(n.watchSeats(this.code, (seats) => this.onSeats(seats)));
      this.stops.push(
        n.watchMembers(this.code, (members) => {
          this.set({ members });
          this.syncWaiting();
        }),
      );
      this.stops.push(
        n.watchPresence(this.code, (online) => {
          this.set({ online });
          if (this.host)
            for (const s of this.state.seats)
              if (s.uid) this.host.setPresent(s.uid, online.has(s.uid));
          this.syncWaiting();
        }),
      );
      if (isHost) this.stops.push(n.watchInbox(this.code, (m) => this.onInbox(m)));
    } catch (e) {
      this.set({ phase: 'error', error: String(e) });
    }
  }

  private onStatus(meta: RoomMeta): void {
    const session = this.state.session;
    if (meta.status === 'lobby' || meta.status === 'ended') {
      // Convidado olhando o resultado final continua nele até escolher voltar à sala.
      if (session && !ended(session)) this.endSession();
      this.set({ phase: 'lobby' });
      return;
    }
    // Partida (nova) em andamento: quem ainda estava no resultado da anterior vai para a nova.
    if (session && ended(session) && !this.state.isHost) this.endSession();
    if (!this.state.session) {
      if (this.state.isHost) this.resumeHost();
      else this.awaitGuestView();
    }
    // Quem ficou sem assento no lobby entra na fila para assumir um bot.
    this.syncWaiting();
  }

  private onSeats(seats: RoomSeat[]): void {
    const before = this.state.seats;
    const index = seats.findIndex((s) => s.type === 'human' && s.uid === this.me.uid);
    const mySeat = index >= 0 ? index : null;
    if (this.state.session && !ended(this.state.session)) this.noticesFrom(before, seats);
    this.set({ seats, mySeat });
    if (this.guest) {
      const settings = this.state.meta ? this.config(this.state.meta).settings : null;
      if (settings) this.guest.setSeats(seatsForMatch(seats, settings.difficulty, ['sora']));
    } else if (!this.state.isHost && mySeat !== null) {
      void net().then((n) => this.openGuest(n));
    }
  }

  /** Avisos na mesa a partir da mudança dos assentos (a cobertura é gravada pelo anfitrião). */
  private noticesFrom(before: readonly RoomSeat[], after: readonly RoomSeat[]): void {
    const fresh: RoomNotice[] = [];
    after.forEach((s, i) => {
      const prev = before[i];
      if (!prev || s.type !== 'human' || !s.uid || s.uid === this.me.uid) return;
      const name = s.displayName;
      if (prev.uid !== s.uid) fresh.push({ id: ++this.noticeSeq, kind: 'joined', name });
      else if (s.cover && s.cover !== prev.cover)
        fresh.push({ id: ++this.noticeSeq, kind: s.cover, name });
      else if (!s.cover && prev.cover) fresh.push({ id: ++this.noticeSeq, kind: 'back', name });
    });
    if (fresh.length === 0) return;
    this.set({ notices: [...this.state.notices, ...fresh].slice(-4) });
    const ids = new Set(fresh.map((x) => x.id));
    setTimeout(
      () => this.set({ notices: this.state.notices.filter((x) => !ids.has(x.id)) }),
      NOTICE_MS,
    );
  }

  // ---------- lobby ----------

  /** Convidado pede um assento (o anfitrião é quem escreve os assentos). */
  async claimSeat(seat: number): Promise<void> {
    const n = await net();
    if (this.state.isHost) return this.hostMove(this.me.uid, seat, this.profile);
    await n.sendToInbox(
      this.code,
      this.me.uid,
      { type: 'claimSeat', seat, name: this.me.displayName, avatar: this.me.avatar },
      Date.now(),
    );
  }

  async leaveSeat(): Promise<void> {
    const n = await net();
    if (this.state.isHost) return;
    await n.sendToInbox(this.code, this.me.uid, { type: 'leaveSeat' }, Date.now());
  }

  /** Anfitrião: personagem de um assento de bot ("empty" = vazio, vira bot ao começar). */
  async setBot(seat: number, characterId: CharacterId | null): Promise<void> {
    if (!this.state.isHost) return;
    const seats = [...this.state.seats];
    const cur = seats[seat];
    if (!cur || cur.type === 'human') return;
    seats[seat] = characterId
      ? { type: 'bot', displayName: '', characterId }
      : { type: 'empty', displayName: '' };
    await (await net()).writeSeats(this.code, seats);
  }

  private async hostMove(uid: string, seat: number, who: RoomMember): Promise<void> {
    const seats = this.state.seats.map((s) =>
      s.type === 'human' && s.uid === uid ? ({ type: 'empty', displayName: '' } as RoomSeat) : s,
    );
    const target = seats[seat];
    if (!target || target.type === 'human') return;
    seats[seat] = roomSeatOf(humanSetup(uid, who));
    await (await net()).writeSeats(this.code, seats);
  }

  private onInbox(msg: { uid: string; clientSeq: number; action: { type: string } }): void {
    const a = msg.action as { type: string; seat?: number; name?: string; avatar?: string };
    if (a.type === 'resume') {
      this.host?.resume(msg.uid);
      return;
    }
    if (a.type === 'claimSeat' || a.type === 'leaveSeat') {
      const status = this.state.meta?.status;
      if (status !== 'lobby' && status !== 'ended') return;
      if (a.type === 'leaveSeat') {
        const seats = this.state.seats.map((s) =>
          s.type === 'human' && s.uid === msg.uid
            ? ({ type: 'empty', displayName: '' } as RoomSeat)
            : s,
        );
        void net().then((n) => n.writeSeats(this.code, seats));
      } else if (typeof a.seat === 'number') {
        // O perfil vem de members (com a foto); o pedido serve de reserva.
        const who = this.state.members[msg.uid] ?? {
          displayName: String(a.name ?? ''),
          avatar: String(a.avatar ?? ''),
        };
        void this.hostMove(msg.uid, a.seat, who);
      }
      return;
    }
    this.host?.receive(msg as Parameters<HostSession['receive']>[0]);
  }

  // ---------- partida ----------

  private config(meta: RoomMeta): { rules: RuleSet; settings: RoomSettings } {
    return {
      rules: JSON.parse(meta.rules) as RuleSet,
      settings: JSON.parse(meta.settings) as RoomSettings,
    };
  }

  /** Membros online sem assento (o anfitrião confirma antes de começar sem eles). */
  unseated(): RoomMember[] {
    return Object.entries(this.state.members)
      .filter(([uid]) => this.state.online.has(uid) && !this.state.seats.some((s) => s.uid === uid))
      .map(([, m]) => m);
  }

  /** Anfitrião: grava os assentos da partida com quem está coberto por bot. */
  private hostSeats(n: Net): SeatsListener {
    return (seats, covers) =>
      void n.writeSeats(
        this.code,
        seats.map((s, i) => roomSeatOf(s, covers[i as Seat])),
      );
  }

  /** Anfitrião: ao terminar a partida, a sala fica "encerrada" (todos veem o resultado). */
  private watchEnd(host: HostSession, n: Net): void {
    let done = false;
    host.subscribe((view: PlayerView) => {
      if (done || view.phase !== 'matchEnded') return;
      done = true;
      void n.setStatus(this.code, 'ended');
    });
  }

  /** Quem está na sala, online e sem assento entra na fila para assumir um bot na próxima mão. */
  private syncWaiting(): void {
    const host = this.host;
    if (!host || this.state.meta?.status !== 'playing') return;
    for (const [uid, m] of Object.entries(this.state.members)) {
      if (uid === this.me.uid || host.seatOf(uid) !== null) continue;
      if (this.state.online.has(uid)) host.queueJoin(humanSetup(uid, m));
      else host.setPresent(uid, false);
    }
  }

  /** Anfitrião começa: vazios viram bots, assentos finais publicados, sessão criada (13.2). */
  async startMatch(): Promise<void> {
    const meta = this.state.meta;
    if (!this.state.isHost || !meta || this.state.mySeat === null) return;
    const n = await net();
    const { rules, settings } = this.config(meta);
    const free = this.state.seats.filter((s) => s.type !== 'human').length;
    const chars = resolveCharacters(settings.characters, Math.max(free, 1));
    const setups = seatsForMatch(this.state.seats.map(withoutCover), settings.difficulty, chars);
    await n.writeSeats(
      this.code,
      setups.map((s) => roomSeatOf(s)),
    );
    const { createMatch } = await import('../engine');
    const seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
    this.host = new HostSession({
      state: createMatch(rules, seed).state,
      settings: { timer: settings.timer, training: false },
      seats: setups,
      localSeat: this.state.mySeat as Seat,
      saveKey: saveKeyOf(this.code),
      botRunner: workerBotRunner,
      transport: { publish: (u) => void n.publishHostUpdate(this.code, u) },
      onSeats: this.hostSeats(n),
    });
    this.watchEnd(this.host, n);
    this.set({ session: this.host, phase: 'playing', notices: [] });
    await n.setStatus(this.code, 'playing');
    this.syncWaiting();
  }

  /** Anfitrião voltou com a partida em andamento: retoma do autosave local (13.6). */
  private resumeHost(): void {
    const saved = loadMatch(undefined, saveKeyOf(this.code));
    if (saved.status !== 'ok') {
      // Sem o estado local, não há como continuar: volta ao lobby.
      void net().then((n) => n.setStatus(this.code, 'lobby'));
      return;
    }
    void net().then((n) => {
      if (this.host || this.disposed) return;
      const host = HostSession.resumeRoom(saved.snapshot, {
        saveKey: saveKeyOf(this.code),
        botRunner: workerBotRunner,
        transport: { publish: (u) => void n.publishHostUpdate(this.code, u) },
        onSeats: this.hostSeats(n),
      });
      this.host = host;
      this.watchEnd(host, n);
      for (const s of host.seats)
        if (s.kind === 'human' && s.uid && s.uid !== this.me.uid)
          host.setPresent(s.uid, this.state.online.has(s.uid));
      // Coberturas gravadas antes de recarregar não valem mais: grava as atuais.
      this.hostSeats(n)(host.seats, host.covers());
      this.set({ session: host, phase: 'playing' });
      this.syncWaiting();
    });
  }

  /** Convidado: espera a primeira visão do anfitrião para abrir a mesa. */
  private awaitGuestView(): void {
    if (this.stopPrivate) return;
    void net().then((n) => {
      if (this.stopPrivate || this.disposed) return;
      this.stopPrivate = n.watchPrivate(this.code, this.me.uid, (payload) => {
        if (this.guest) {
          for (const l of this.guestListeners) l(payload);
          return;
        }
        this.pendingPayload = payload;
        this.openGuest(n);
      });
    });
  }

  /** Abre a mesa do convidado quando há visão e ele está sentado. */
  private openGuest(n: Net): void {
    const payload = this.pendingPayload;
    const meta = this.state.meta;
    if (this.guest || !payload || !meta || meta.status !== 'playing') return;
    const mySeat = this.state.seats.findIndex((s) => s.uid === this.me.uid);
    if (mySeat < 0) return;
    // Visão que sobrou da partida anterior: espera a da nova.
    if ((JSON.parse(payload.view) as PlayerView).phase === 'matchEnded') return;
    const { rules, settings } = this.config(meta);
    this.pendingPayload = null;
    this.guest = new GuestSession({
      rules,
      settings: { timer: settings.timer, training: false },
      seats: seatsForMatch(this.state.seats, settings.difficulty, ['sora']),
      localSeat: mySeat as Seat,
      initial: payload,
      transport: {
        onPrivate: (cb) => {
          this.guestListeners.add(cb);
          return () => this.guestListeners.delete(cb);
        },
        send: (action, clientSeq) => void n.sendToInbox(this.code, this.me.uid, action, clientSeq),
      },
    });
    this.set({ session: this.guest, phase: 'playing', notices: [] });
  }

  private endSession(): void {
    this.stopPrivate?.();
    this.stopPrivate = null;
    this.state.session?.dispose();
    this.host = null;
    this.guest = null;
    this.guestListeners.clear();
    this.pendingPayload = null;
    this.set({ session: null, notices: [] });
  }

  /** "Voltar a jogar" depois de um bot assumir por inatividade. */
  async resume(): Promise<void> {
    if (this.host) {
      this.host.resume();
      return;
    }
    await (await net()).sendToInbox(this.code, this.me.uid, { type: 'resume' }, Date.now());
  }

  /**
   * Fim da partida → volta à sala (código, assentos, começar de novo). O anfitrião leva todos;
   * o convidado volta sozinho e espera o anfitrião.
   */
  async backToRoom(): Promise<void> {
    this.endSession();
    if (!this.state.isHost) {
      this.set({ phase: 'lobby' });
      return;
    }
    const n = await net();
    await n.writeSeats(this.code, this.state.seats.map(withoutCover));
    await n.setStatus(this.code, 'lobby');
  }

  /** Anfitrião: encerra e apaga a sala (13.8). */
  async closeRoom(): Promise<void> {
    if (!this.state.isHost) return;
    this.endSession();
    forgetActiveRoom(this.code);
    await (await net()).deleteRoom(this.code);
  }

  /** Saiu da sala de propósito (fora de uma partida): o menu não oferece mais a volta. */
  forget(): void {
    forgetActiveRoom(this.code);
  }

  dispose(): void {
    this.endSession();
    this.disposed = true;
    this.generation += 1;
    for (const s of this.stops.splice(0)) s();
  }
}
