/**
 * Sessão solo (spec 5.4): roda o motor e os bots no navegador, sem rede. Os bots respondem com atraso
 * "humano" variável para que a velocidade não revele se tinham chamada (spec 5.2).
 */
import { createBot, type BotPolicy } from '../bots';
import {
  applyAction,
  canStartNextHand,
  createMatch,
  createRng,
  eventsForSeat,
  getLegalActions,
  getPlayerView,
  getTrainingView,
  hasAnyAction,
  startNextHand,
  type Action,
  type GameEvent,
  type LegalActions,
  type MatchState,
  type PlayerView,
  type Rng,
  type RuleSet,
  type Seat,
  type Tile,
} from '../engine';
import { consume, type TimerSettings } from './clock';
import { winsFromEvents, type LoggedWin } from './history';
import { PACING } from './pacing';
import { clearMatch, saveMatch, SAVE_SCHEMA_VERSION, type MatchSnapshot } from './storage';
import type { ClockView, MatchSession, MatchSettings, SeatSetup, SessionListener } from './types';

export interface Scheduler {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const realScheduler: Scheduler = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Semente de 32 bits com crypto.getRandomValues (spec 5.5). */
export function randomSeed(): number {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] as number;
}

/** Atrasos dos bots (ms). Configuráveis para testes. */
export interface BotDelays {
  readonly turn: readonly [number, number];
  readonly call: readonly [number, number];
  /** Espera as animações (anúncios, voo da pedra, início de mão) antes de alguém agir. */
  readonly presentation: boolean;
}

export const HUMAN_LIKE_DELAYS: BotDelays = {
  turn: PACING.botTurnMs,
  call: PACING.botCallMs,
  presentation: true,
};
export const NO_DELAYS: BotDelays = { turn: [0, 0], call: [0, 0], presentation: false };

/** Quanto a apresentação dos eventos leva antes de a mesa seguir (ms). */
export function presentationPause(events: readonly GameEvent[]): number {
  let pause = 0;
  for (const e of events) {
    if (e.type === 'HandStarted') pause = Math.max(pause, PACING.handStartMs);
    else if (e.type === 'CallMade' || e.type === 'RiichiDeclared' || e.type === 'KitaDeclared') {
      pause = Math.max(pause, PACING.callAnnouncementMs);
    } else if (e.type === 'TileDiscarded') {
      pause = Math.max(pause, e.riichi ? PACING.callAnnouncementMs : PACING.discardFlightMs);
    }
  }
  return pause;
}

export interface LocalSessionOptions {
  readonly state: MatchState;
  readonly settings: MatchSettings;
  readonly seats: readonly SeatSetup[];
  readonly localSeat: Seat;
  readonly banks?: Partial<Record<Seat, number>>;
  readonly scheduler?: Scheduler;
  readonly delays?: BotDelays;
  readonly seed?: () => number;
  /** Autosave (padrão: localStorage). `false` desliga. */
  readonly autosave?: boolean;
  /** Chave do autosave (sala: uma por código). */
  readonly saveKey?: string;
  readonly winLog?: readonly LoggedWin[];
  /** Tolerância de rede somada ao prazo de jogadores remotos (spec 13.5). */
  readonly remoteGraceMs?: number;
}

interface HumanClock {
  readonly startedAt: number;
  readonly baseMs: number;
  readonly bankMs: number;
}

interface Remaining {
  readonly baseMs: number;
  readonly bankMs: number;
}

const bankMsOf = (t: TimerSettings) => (t.mode === 'timed' ? t.bankSeconds * 1000 : 0);

/** Bot que assume o assento de um amigo desconectado (spec 13.6): Normal, estilo equilibrado. */
const coverBot = (): BotPolicy => createBot('normal', 'sora');

export class LocalSession implements MatchSession {
  readonly rules: RuleSet;
  readonly settings: MatchSettings;
  readonly seats: readonly SeatSetup[];
  readonly localSeat: Seat;
  readonly source: 'solo' | 'room' = 'solo';

  protected state: MatchState;
  private readonly listeners = new Set<SessionListener>();
  private readonly bots: Partial<Record<Seat, BotPolicy>> = {};
  /** Humanos ausentes cobertos por bot (sala). */
  private readonly covered = new Map<Seat, BotPolicy>();
  private readonly botRng: Rng;
  private readonly delayRng: Rng;
  protected readonly scheduler: Scheduler;
  private readonly delays: BotDelays;
  private readonly seed: () => number;
  private readonly autosave: boolean;
  private readonly saveKey: string | undefined;
  private readonly remoteGraceMs: number;
  protected readonly banks: Partial<Record<Seat, number>>;
  private timers: unknown[] = [];
  /** Relógio de cada humano decidindo agora (vários podem decidir ao mesmo tempo, ex.: chamadas). */
  private readonly clocks = new Map<Seat, HumanClock>();
  /** Pausada: relógios congelados (tempo que restava) e nenhum temporizador ativo. */
  private paused = false;
  private readonly frozen = new Map<Seat, Remaining>();
  private version = 0;
  private readonly winLog: LoggedWin[];
  protected disposed = false;

  constructor(opts: LocalSessionOptions) {
    this.state = opts.state;
    this.rules = opts.state.rules;
    this.settings = opts.settings;
    this.seats = opts.seats;
    this.localSeat = opts.localSeat;
    this.scheduler = opts.scheduler ?? realScheduler;
    this.delays = opts.delays ?? HUMAN_LIKE_DELAYS;
    this.seed = opts.seed ?? randomSeed;
    this.autosave = opts.autosave ?? true;
    this.saveKey = opts.saveKey;
    this.remoteGraceMs = opts.remoteGraceMs ?? 0;
    this.botRng = createRng(this.seed());
    this.delayRng = createRng(this.seed());
    this.banks = { ...opts.banks };
    this.winLog = [...(opts.winLog ?? [])];
    opts.seats.forEach((setup, i) => {
      const seat = i as Seat;
      if (setup.kind === 'bot') this.bots[seat] = createBot(setup.skill, setup.characterId);
      else if (this.banks[seat] === undefined) this.banks[seat] = bankMsOf(opts.settings.timer);
    });
    // Começa no próximo ciclo, para que a UI possa se inscrever antes.
    this.schedule(() => this.afterChange([]), 0);
  }

  /** Cria uma partida nova. */
  static create(
    rules: RuleSet,
    settings: MatchSettings,
    seats: readonly SeatSetup[],
    localSeat: Seat,
    extra: Omit<LocalSessionOptions, 'state' | 'settings' | 'seats' | 'localSeat'> = {},
  ): LocalSession {
    const seed = extra.seed ?? randomSeed;
    const { state } = createMatch(rules, seed());
    return new LocalSession({ ...extra, state, settings, seats, localSeat });
  }

  /** Retoma uma partida salva. */
  static resume(
    snapshot: MatchSnapshot,
    extra: Omit<LocalSessionOptions, 'state' | 'settings' | 'seats' | 'localSeat' | 'banks'> = {},
  ): LocalSession {
    return new LocalSession(LocalSession.optionsFrom(snapshot, extra));
  }

  protected static optionsFrom(
    snapshot: MatchSnapshot,
    extra: Omit<LocalSessionOptions, 'state' | 'settings' | 'seats' | 'localSeat' | 'banks'>,
  ): LocalSessionOptions {
    return {
      ...extra,
      state: snapshot.state,
      settings: snapshot.settings,
      seats: snapshot.seats,
      localSeat: snapshot.localSeat,
      banks: snapshot.banks,
      winLog: snapshot.winLog ?? [],
    };
  }

  getView(): PlayerView {
    return getPlayerView(this.state, this.localSeat);
  }

  /** Estado completo — só para depuração e testes da sessão local. */
  getState(): MatchState {
    return this.state;
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  submit(action: Action): void {
    if (this.disposed) return;
    this.apply(this.localSeat, action);
  }

  getClock(): ClockView | null {
    return this.clockFor(this.localSeat);
  }

  /** Relógio de qualquer assento humano decidindo agora (o anfitrião publica para cada um). */
  clockFor(seat: Seat): ClockView | null {
    if (this.settings.timer.mode !== 'timed') return null;
    const now = this.scheduler.now();
    const hasBank = this.settings.timer.bankSeconds > 0;
    const frozen = this.paused ? this.frozen.get(seat) : undefined;
    if (frozen) return { seat, ...frozen, hasBank, at: now };
    const c = this.clocks.get(seat);
    if (!c) return null;
    const r = consume(c.baseMs, c.bankMs, now - c.startedAt);
    return { seat, baseMs: r.baseMs, bankMs: r.bankMs, hasBank, at: now };
  }

  getRevealedHands(): Readonly<Partial<Record<Seat, readonly Tile[]>>> | null {
    if (!this.settings.training) return null;
    return getTrainingView(this.state, this.localSeat).revealedHands;
  }

  setPaused(paused: boolean): void {
    if (this.disposed || paused === this.paused) return;
    if (paused) {
      this.frozen.clear();
      const now = this.scheduler.now();
      for (const [seat, c] of this.clocks) {
        const r = consume(c.baseMs, c.bankMs, now - c.startedAt);
        this.frozen.set(seat, { baseMs: r.baseMs, bankMs: r.bankMs });
      }
      this.clocks.clear();
      this.paused = true;
      this.version += 1;
      this.cancelTimers();
      return;
    }
    this.paused = false;
    this.version += 1;
    this.proceed(0);
    this.frozen.clear();
    this.onChange([]);
  }

  getWinLog(): readonly LoggedWin[] {
    return this.winLog;
  }

  dispose(): void {
    this.disposed = true;
    this.cancelTimers();
    this.listeners.clear();
  }

  // -------------------------------------------------------------------------------------------
  // Para a sessão do anfitrião (sala)

  /** Ação de outro jogador humano (convidado da sala). O motor valida; ação ilegal lança erro. */
  protected submitFor(seat: Seat, action: Action): void {
    if (this.disposed) return;
    if (this.seats[seat]?.kind !== 'human' || this.covered.has(seat)) {
      throw new Error('Assento não é de um jogador presente');
    }
    this.apply(seat, action);
  }

  /** Liga/desliga o bot que cobre um humano ausente; a mesa segue na hora. */
  protected setCovered(seat: Seat, covered: boolean): void {
    if (this.seats[seat]?.kind !== 'human' || covered === this.covered.has(seat)) return;
    this.stopClock(seat);
    if (covered) this.covered.set(seat, coverBot());
    else this.covered.delete(seat);
    if (this.paused || this.disposed) return;
    this.version += 1;
    this.cancelTimers();
    this.proceed(0);
    this.onChange([]);
  }

  protected isCovered(seat: Seat): boolean {
    return this.covered.has(seat);
  }

  /** Chamado depois de cada mudança (o anfitrião publica as visões de todos aqui). */
  protected onChange(_events: readonly GameEvent[]): void {
    // a sessão solo não publica nada
  }

  // -------------------------------------------------------------------------------------------

  private apply(seat: Seat, action: Action): void {
    this.stopClock(seat);
    const result = applyAction(this.state, seat, action);
    this.state = result.state;
    const summary = result.state.summary;
    if (summary) this.winLog.push(...winsFromEvents(result.events, summary));
    this.afterChange(result.events);
  }

  private afterChange(events: readonly GameEvent[]): void {
    if (this.disposed) return;
    this.version += 1;
    this.cancelTimers();
    this.clocks.clear();
    if (events.some((e) => e.type === 'HandStarted')) this.refillBanks();
    this.persist();
    const view = this.getView();
    const playerEvents = eventsForSeat(events, this.localSeat);
    for (const l of this.listeners) l(view, playerEvents);

    if (!this.paused) this.proceed(this.delays.presentation ? presentationPause(events) : 0);
    this.onChange(events);
  }

  /** Segue a partida: próxima mão, ou bots e relógios depois da pausa de apresentação. */
  private proceed(pause: number): void {
    if (this.state.phase === 'matchEnded') return;
    if (canStartNextHand(this.state)) {
      const next = this.state;
      this.schedule(() => {
        if (this.state !== next) return;
        const r = startNextHand(this.state, this.seed());
        this.state = r.state;
        this.afterChange(r.events);
      }, 0);
      return;
    }
    if (pause === 0) {
      this.scheduleActors();
      return;
    }
    const version = this.version;
    this.schedule(() => {
      if (this.version !== version) return;
      this.scheduleActors();
      // Relógios novos depois da apresentação: o anfitrião publica os prazos.
      this.onChange([]);
    }, pause);
  }

  private scheduleActors(): void {
    const version = this.version;
    const n = this.rules.players;
    for (let i = 0; i < n; i++) {
      const seat = i as Seat;
      const legal = getLegalActions(this.state, seat);
      if (!hasAnyAction(legal)) continue;
      const bot = this.bots[seat] ?? this.covered.get(seat);
      if (bot) {
        const delay = legal.ackSummary
          ? 0
          : this.randomDelay(legal.pass ? this.delays.call : this.delays.turn);
        this.schedule(() => {
          if (this.version !== version) return;
          const action = bot.decide(getPlayerView(this.state, seat), legal, this.botRng);
          this.apply(seat, action);
        }, delay);
      } else if (!legal.ackSummary) {
        this.startClock(seat, legal, version);
      }
    }
  }

  private startClock(seat: Seat, legal: LegalActions, version: number): void {
    const timer = this.settings.timer;
    if (timer.mode !== 'timed') return;
    // Retomando de uma pausa, o relógio continua de onde parou.
    const resumed = this.frozen.get(seat);
    const baseMs = resumed ? resumed.baseMs : timer.baseSeconds * 1000;
    const bankMs = resumed ? resumed.bankMs : (this.banks[seat] ?? 0);
    this.clocks.set(seat, { startedAt: this.scheduler.now(), baseMs, bankMs });
    const grace = seat === this.localSeat ? 0 : this.remoteGraceMs;
    this.schedule(
      () => {
        if (this.version !== version) return;
        this.apply(seat, defaultAction(this.state, seat, legal));
      },
      baseMs + bankMs + grace,
    );
  }

  private stopClock(seat: Seat): void {
    const c = this.clocks.get(seat);
    if (!c) return;
    const r = consume(c.baseMs, c.bankMs, this.scheduler.now() - c.startedAt);
    this.banks[seat] = r.bankMs;
    this.clocks.delete(seat);
  }

  private refillBanks(): void {
    const full = bankMsOf(this.settings.timer);
    for (const [seat, setup] of this.seats.entries())
      if (setup.kind === 'human') this.banks[seat as Seat] = full;
  }

  private randomDelay([min, max]: readonly [number, number]): number {
    return min + Math.floor(this.delayRng.next() * (max - min + 1));
  }

  private schedule(fn: () => void, ms: number): void {
    this.timers.push(this.scheduler.setTimeout(fn, ms));
  }

  private cancelTimers(): void {
    for (const t of this.timers) this.scheduler.clearTimeout(t);
    this.timers = [];
  }

  protected snapshot(): MatchSnapshot {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: this.state,
      settings: this.settings,
      seats: this.seats,
      localSeat: this.localSeat,
      banks: this.banks,
      winLog: this.winLog,
    };
  }

  private persist(): void {
    if (!this.autosave) return;
    if (this.state.phase === 'matchEnded') {
      clearMatch(undefined, this.saveKey);
      return;
    }
    saveMatch(this.snapshot(), undefined, this.saveKey);
  }
}

/** Ação padrão no estouro do tempo (spec 10.4): descarta a peça comprada ou passa. */
export function defaultAction(state: MatchState, seat: Seat, legal: LegalActions): Action {
  if (legal.pass) return { type: 'pass' };
  const drawn = state.hand?.players[seat]?.drawn ?? null;
  const tile =
    (drawn && legal.discard.find((t) => t.id === drawn.id)) ??
    legal.discard[legal.discard.length - 1];
  if (tile) return { type: 'discard', tile };
  if (legal.ackSummary) return { type: 'ackSummary' };
  throw new Error('Sem ação padrão disponível');
}
