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
  readonly winLog?: readonly LoggedWin[];
}

interface HumanClock {
  readonly seat: Seat;
  readonly startedAt: number;
  readonly baseMs: number;
  readonly bankMs: number;
}

const bankMsOf = (t: TimerSettings) => (t.mode === 'timed' ? t.bankSeconds * 1000 : 0);

export class LocalSession implements MatchSession {
  readonly rules: RuleSet;
  readonly settings: MatchSettings;
  readonly seats: readonly SeatSetup[];
  readonly localSeat: Seat;
  readonly source: 'solo' | 'room' = 'solo';

  private state: MatchState;
  private readonly listeners = new Set<SessionListener>();
  private readonly bots: Partial<Record<Seat, BotPolicy>> = {};
  private readonly botRng: Rng;
  private readonly delayRng: Rng;
  private readonly scheduler: Scheduler;
  private readonly delays: BotDelays;
  private readonly seed: () => number;
  private readonly autosave: boolean;
  private readonly banks: Partial<Record<Seat, number>>;
  private timers: unknown[] = [];
  private clock: HumanClock | null = null;
  /** Pausada: relógio congelado (tempo que restava) e nenhum temporizador ativo. */
  private paused = false;
  private frozen: { readonly seat: Seat; readonly baseMs: number; readonly bankMs: number } | null =
    null;
  private version = 0;
  private readonly winLog: LoggedWin[];
  private disposed = false;

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
    return new LocalSession({
      ...extra,
      state: snapshot.state,
      settings: snapshot.settings,
      seats: snapshot.seats,
      localSeat: snapshot.localSeat,
      banks: snapshot.banks,
      winLog: snapshot.winLog ?? [],
    });
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
    if (this.paused && this.frozen && this.settings.timer.mode === 'timed') {
      return {
        seat: this.frozen.seat,
        baseMs: this.frozen.baseMs,
        bankMs: this.frozen.bankMs,
        hasBank: this.settings.timer.bankSeconds > 0,
        at: this.scheduler.now(),
      };
    }
    const c = this.clock;
    if (!c || this.settings.timer.mode !== 'timed') return null;
    const now = this.scheduler.now();
    const r = consume(c.baseMs, c.bankMs, now - c.startedAt);
    return {
      seat: c.seat,
      baseMs: r.baseMs,
      bankMs: r.bankMs,
      hasBank: this.settings.timer.bankSeconds > 0,
      at: now,
    };
  }

  getRevealedHands(): Readonly<Partial<Record<Seat, readonly Tile[]>>> | null {
    if (!this.settings.training) return null;
    return getTrainingView(this.state, this.localSeat).revealedHands;
  }

  setPaused(paused: boolean): void {
    if (this.disposed || paused === this.paused) return;
    if (paused) {
      const c = this.clock;
      this.frozen = c
        ? { seat: c.seat, ...consume(c.baseMs, c.bankMs, this.scheduler.now() - c.startedAt) }
        : null;
      this.clock = null;
      this.paused = true;
      this.version += 1;
      this.cancelTimers();
      return;
    }
    this.paused = false;
    this.version += 1;
    this.proceed(0);
    this.frozen = null;
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
    if (events.some((e) => e.type === 'HandStarted')) this.refillBanks();
    this.persist();
    const view = this.getView();
    const playerEvents = eventsForSeat(events, this.localSeat);
    for (const l of this.listeners) l(view, playerEvents);

    if (this.paused) return;
    this.proceed(this.delays.presentation ? presentationPause(events) : 0);
  }

  /** Segue a partida: próxima mão, ou bots e relógio depois da pausa de apresentação. */
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
      if (this.version === version) this.scheduleActors();
    }, pause);
  }

  private scheduleActors(): void {
    const version = this.version;
    const n = this.rules.players;
    for (let i = 0; i < n; i++) {
      const seat = i as Seat;
      const legal = getLegalActions(this.state, seat);
      if (!hasAnyAction(legal)) continue;
      const bot = this.bots[seat];
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
    const resumed = this.frozen?.seat === seat ? this.frozen : null;
    const baseMs = resumed ? resumed.baseMs : timer.baseSeconds * 1000;
    const bankMs = resumed ? resumed.bankMs : (this.banks[seat] ?? 0);
    this.clock = { seat, startedAt: this.scheduler.now(), baseMs, bankMs };
    this.schedule(() => {
      if (this.version !== version) return;
      this.apply(seat, defaultAction(this.state, seat, legal));
    }, baseMs + bankMs);
  }

  private stopClock(seat: Seat): void {
    const c = this.clock;
    if (!c || c.seat !== seat) return;
    const r = consume(c.baseMs, c.bankMs, this.scheduler.now() - c.startedAt);
    this.banks[seat] = r.bankMs;
    this.clock = null;
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

  private persist(): void {
    if (!this.autosave) return;
    if (this.state.phase === 'matchEnded') {
      clearMatch();
      return;
    }
    saveMatch({
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: this.state,
      settings: this.settings,
      seats: this.seats,
      localSeat: this.localSeat,
      banks: this.banks,
      winLog: this.winLog,
    });
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
