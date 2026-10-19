/**
 * Controlador de uma sala (spec 13.2): lobby, início, retomada do anfitrião, presença e a sessão de
 * jogo (HostSession no anfitrião, GuestSession nos convidados). Fala com o Firebase só por
 * net/room (carregado sob demanda). A interface lê o estado com subscribe/getState.
 */
import type { BotSkill, CharacterId } from '../bots';
import { workerBotRunner } from '../bots/workerClient';
import type { RuleSet, Seat } from '../engine';
import {
  GuestSession,
  HostSession,
  loadMatch,
  PROTOCOL_VERSION,
  seatsForMatch,
  type MatchSession,
  type MatchSettings,
  type PrivatePayload,
  type RoomMeta,
  type RoomSeat,
} from '../session';
import { resolveCharacters } from './match';
import type { CharacterChoice } from './settings';

/** Configuração da sala (meta.settings): o que a partida solo tem + adversários bots. */
export interface RoomSettings extends MatchSettings {
  readonly difficulty: BotSkill;
  readonly characters: readonly CharacterChoice[];
}

export type RoomPhase =
  'loading' | 'notFound' | 'outdated' | 'closed' | 'lobby' | 'starting' | 'playing' | 'error';

export interface RoomState {
  readonly phase: RoomPhase;
  readonly meta: RoomMeta | null;
  readonly seats: readonly RoomSeat[];
  readonly online: ReadonlySet<string>;
  readonly isHost: boolean;
  readonly mySeat: number | null;
  readonly session: MatchSession | null;
  readonly error: string | null;
}

export interface Me {
  readonly uid: string;
  readonly displayName: string;
  readonly avatar: string;
}

const net = () => import('../net/room');
const saveKeyOf = (code: string) => `match:room:${code}`;

export class RoomController {
  private state: RoomState = {
    phase: 'loading',
    meta: null,
    seats: [],
    online: new Set(),
    isHost: false,
    mySeat: null,
    session: null,
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private readonly stops: (() => void)[] = [];
  private stopPrivate: (() => void) | null = null;
  private host: HostSession | null = null;
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

  /** Pode ser chamado de novo depois de dispose (o modo estrito do React monta efeitos duas vezes). */
  async start(): Promise<void> {
    this.disposed = false;
    const gen = ++this.generation;
    const alive = () => gen === this.generation && !this.disposed;
    try {
      const n = await net();
      const meta = await n.readMeta(this.code);
      if (!alive()) return;
      if (!meta) return this.set({ phase: 'notFound' });
      if (meta.protocolVersion !== PROTOCOL_VERSION) return this.set({ phase: 'outdated', meta });
      const isHost = meta.hostUid === this.me.uid;
      if (!isHost) {
        try {
          await n.joinRoom(this.code, this.me.uid);
        } catch {
          // Fora do lobby só entra quem já é membro (reconexão); os outros veem "sala fechada".
          if (meta.status !== 'lobby') {
            const reading = await new Promise<boolean>((resolve) => {
              const stop = n.watchSeats(this.code, () => resolve(true));
              setTimeout(() => resolve(false), 3000);
              this.stops.push(stop);
            });
            if (!reading) return this.set({ phase: 'closed', meta });
          } else throw new Error('join');
        }
      }
      if (!alive()) return;
      this.set({ meta, isHost, phase: meta.status === 'playing' ? 'starting' : 'lobby' });
      this.stops.push(n.trackPresence(this.code, this.me.uid));
      this.stops.push(
        n.watchMeta(this.code, (m) => {
          if (!m) {
            this.endSession();
            return this.set({ phase: 'closed', meta: null });
          }
          this.set({ meta: m });
          this.onStatus(m);
        }),
      );
      this.stops.push(
        n.watchSeats(this.code, (seats) => {
          const mySeat = seats.findIndex((s) => s.type === 'human' && s.uid === this.me.uid);
          this.set({ seats, mySeat: mySeat >= 0 ? mySeat : null });
        }),
      );
      this.stops.push(
        n.watchPresence(this.code, (online) => {
          this.set({ online });
          if (this.host)
            for (const s of this.state.seats)
              if (s.uid) this.host.setPresent(s.uid, online.has(s.uid));
        }),
      );
      if (isHost) this.stops.push(n.watchInbox(this.code, (m) => this.onInbox(m)));
    } catch (e) {
      this.set({ phase: 'error', error: String(e) });
    }
  }

  private onStatus(meta: RoomMeta): void {
    if (meta.status === 'lobby') {
      if (this.state.session) this.endSession();
      this.set({ phase: 'lobby' });
      return;
    }
    if (meta.status === 'playing' && !this.state.session) {
      if (this.state.isHost) this.resumeHost(meta);
      else this.awaitGuestView(meta);
    }
  }

  // ---------- lobby ----------

  /** Convidado pede um assento (o anfitrião é quem escreve os assentos). */
  async claimSeat(seat: number): Promise<void> {
    const n = await net();
    if (this.state.isHost)
      return this.hostMove(this.me.uid, seat, this.me.displayName, this.me.avatar);
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

  private async hostMove(uid: string, seat: number, name: string, avatar: string): Promise<void> {
    const seats = this.state.seats.map((s) =>
      s.type === 'human' && s.uid === uid ? ({ type: 'empty', displayName: '' } as RoomSeat) : s,
    );
    const target = seats[seat];
    if (!target || target.type === 'human') return;
    seats[seat] = {
      type: 'human',
      uid,
      displayName: name.slice(0, 24) || '?',
      avatar: avatar.slice(0, 64),
    };
    await (await net()).writeSeats(this.code, seats);
  }

  private onInbox(msg: { uid: string; clientSeq: number; action: { type: string } }): void {
    const a = msg.action as { type: string; seat?: number; name?: string; avatar?: string };
    if (a.type === 'claimSeat' || a.type === 'leaveSeat') {
      if (this.state.meta?.status !== 'lobby') return;
      if (a.type === 'leaveSeat') {
        const seats = this.state.seats.map((s) =>
          s.type === 'human' && s.uid === msg.uid
            ? ({ type: 'empty', displayName: '' } as RoomSeat)
            : s,
        );
        void net().then((n) => n.writeSeats(this.code, seats));
      } else if (typeof a.seat === 'number') {
        void this.hostMove(msg.uid, a.seat, String(a.name ?? ''), String(a.avatar ?? ''));
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

  /** Anfitrião começa: vazios viram bots, assentos finais publicados, sessão criada (13.2). */
  async startMatch(): Promise<void> {
    const meta = this.state.meta;
    if (!this.state.isHost || !meta || this.state.mySeat === null) return;
    const n = await net();
    const { rules, settings } = this.config(meta);
    const free = this.state.seats.filter((s) => s.type !== 'human').length;
    const chars = resolveCharacters(settings.characters, Math.max(free, 1));
    const setups = seatsForMatch(this.state.seats, settings.difficulty, chars);
    const finalSeats: RoomSeat[] = this.state.seats.map((s, i) => {
      const setup = setups[i];
      return setup?.kind === 'bot'
        ? { type: 'bot', displayName: '', characterId: setup.characterId }
        : s;
    });
    await n.writeSeats(this.code, finalSeats);
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
    });
    this.set({ session: this.host, phase: 'playing' });
    await n.setStatus(this.code, 'playing');
  }

  /** Anfitrião voltou com a partida em andamento: retoma do autosave local (13.6). */
  private resumeHost(meta: RoomMeta): void {
    const saved = loadMatch(undefined, saveKeyOf(this.code));
    if (saved.status !== 'ok') {
      // Sem o estado local, não há como continuar: volta ao lobby.
      void net().then((n) => n.setStatus(this.code, 'lobby'));
      return;
    }
    void net().then((n) => {
      this.host = HostSession.resumeRoom(saved.snapshot, {
        saveKey: saveKeyOf(this.code),
        botRunner: workerBotRunner,
        transport: { publish: (u) => void n.publishHostUpdate(this.code, u) },
      });
      for (const s of this.state.seats)
        if (s.uid && s.uid !== meta.hostUid)
          this.host.setPresent(s.uid, this.state.online.has(s.uid));
      this.set({ session: this.host, phase: 'playing' });
    });
  }

  /** Convidado: espera a primeira visão do anfitrião para abrir a mesa. */
  private awaitGuestView(meta: RoomMeta): void {
    if (this.stopPrivate) return;
    void net().then((n) => {
      let session: GuestSession | null = null;
      const listeners = new Set<(p: PrivatePayload) => void>();
      this.stopPrivate = n.watchPrivate(this.code, this.me.uid, (payload) => {
        if (session) {
          for (const l of listeners) l(payload);
          return;
        }
        const mySeat = this.state.seats.findIndex((s) => s.uid === this.me.uid);
        if (mySeat < 0) return;
        const { rules, settings } = this.config(meta);
        const setups = seatsForMatch(this.state.seats, settings.difficulty, ['sora']);
        session = new GuestSession({
          rules,
          settings: { timer: settings.timer, training: false },
          seats: setups,
          localSeat: mySeat as Seat,
          initial: payload,
          transport: {
            onPrivate: (cb) => {
              listeners.add(cb);
              return () => listeners.delete(cb);
            },
            send: (action, clientSeq) =>
              void n.sendToInbox(this.code, this.me.uid, action, clientSeq),
          },
        });
        this.set({ session, phase: 'playing' });
      });
    });
  }

  private endSession(): void {
    this.stopPrivate?.();
    this.stopPrivate = null;
    this.state.session?.dispose();
    this.host = null;
    this.set({ session: null });
  }

  /** Anfitrião: volta todos ao lobby para jogar de novo. Convidado: volta ao lobby e espera. */
  async playAgain(): Promise<void> {
    if (!this.state.isHost) {
      this.endSession();
      this.set({ phase: 'lobby' });
      return;
    }
    this.endSession();
    await (await net()).setStatus(this.code, 'lobby');
  }

  /** Anfitrião: encerra e apaga a sala (13.8). */
  async closeRoom(): Promise<void> {
    if (!this.state.isHost) return;
    this.endSession();
    await (await net()).deleteRoom(this.code);
  }

  dispose(): void {
    this.endSession();
    this.disposed = true;
    this.generation += 1;
    for (const s of this.stops.splice(0)) s();
  }
}
