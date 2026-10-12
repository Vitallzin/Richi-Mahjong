import { PRESET_YONMA, type Seat } from '../engine';
import {
  consume,
  DEFAULT_TIMER,
  formatClock,
  presetOf,
  TIMER_PRESETS,
  validateTimer,
} from './clock';
import { LocalSession, NO_DELAYS, type Scheduler } from './LocalSession';
import { loadMatch, saveMatch, SAVE_SCHEMA_VERSION, type KeyValueStore } from './storage';
import type { SeatSetup } from './types';

/** Agendador manual: o tempo só anda quando o teste manda. */
class ManualScheduler implements Scheduler {
  private time = 0;
  private seq = 0;
  private queue: { at: number; id: number; fn: () => void }[] = [];
  now = () => this.time;
  setTimeout = (fn: () => void, ms: number) => {
    const id = ++this.seq;
    this.queue.push({ at: this.time + ms, id, fn });
    return id;
  };
  clearTimeout = (h: unknown) => {
    this.queue = this.queue.filter((t) => t.id !== h);
  };
  /** Executa o próximo temporizador; false se não há nenhum. */
  step(): boolean {
    this.queue.sort((a, b) => a.at - b.at || a.id - b.id);
    const next = this.queue.shift();
    if (!next) return false;
    this.time = Math.max(this.time, next.at);
    next.fn();
    return true;
  }
  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      this.queue.sort((a, b) => a.at - b.at || a.id - b.id);
      const next = this.queue[0];
      if (!next || next.at > target) break;
      this.step();
    }
    this.time = target;
  }
}

let seedCounter = 1;
const seed = () => seedCounter++ * 2654435761;

const BOTS: SeatSetup[] = [
  { kind: 'bot', skill: 'normal', characterId: 'sora' },
  { kind: 'bot', skill: 'easy', characterId: 'ren' },
  { kind: 'bot', skill: 'normal', characterId: 'akari' },
  { kind: 'bot', skill: 'easy', characterId: 'sora' },
];

describe('relógio 5+20 (spec 10.4)', () => {
  it('consome a base e depois o banco', () => {
    expect(consume(5000, 20000, 6000)).toEqual({ baseMs: 0, bankMs: 19000, expired: false });
    expect(consume(5000, 20000, 3000)).toEqual({ baseMs: 2000, bankMs: 20000, expired: false });
    expect(consume(5000, 20000, 10000)).toEqual({ baseMs: 0, bankMs: 15000, expired: false });
    expect(consume(5000, 0, 6000).expired).toBe(true);
  });

  it('formata base-banco', () => {
    expect(formatClock({ baseMs: 5000, bankMs: 19000 }, true)).toBe('5-19');
    expect(formatClock({ baseMs: 1200, bankMs: 0 }, true)).toBe('2-0');
    expect(formatClock({ baseMs: 60000, bankMs: 0 }, false)).toBe('60');
  });

  it('presets, padrão e validação de tempo personalizado', () => {
    expect(presetOf(DEFAULT_TIMER)).toBe('5+20');
    expect(presetOf({ mode: 'timed', baseSeconds: 7, bankSeconds: 30 })).toBe('custom');
    expect(presetOf(TIMER_PRESETS.unlimited)).toBe('unlimited');
    expect(validateTimer({ mode: 'timed', baseSeconds: 0, bankSeconds: 20 })).toBe(false);
    expect(validateTimer({ mode: 'timed', baseSeconds: 60, bankSeconds: 300 })).toBe(true);
    expect(validateTimer({ mode: 'timed', baseSeconds: 5, bankSeconds: 301 })).toBe(false);
    expect(validateTimer({ mode: 'timed', baseSeconds: 2.5, bankSeconds: 5 })).toBe(false);
  });
});

describe('LocalSession', () => {
  vi.setConfig({ testTimeout: 60_000 });
  it('uma partida só de bots vai até o fim, com eventos para os ouvintes', () => {
    const scheduler = new ManualScheduler();
    const session = LocalSession.create(
      PRESET_YONMA,
      { timer: DEFAULT_TIMER, training: false },
      BOTS,
      0,
      {
        scheduler,
        delays: NO_DELAYS,
        seed,
        autosave: false,
      },
    );
    let notifications = 0;
    let sawDiscard = false;
    session.subscribe((_view, events) => {
      notifications += 1;
      if (events.some((e) => e.type === 'TileDiscarded')) sawDiscard = true;
    });
    for (let i = 0; i < 50_000 && session.getView().phase !== 'matchEnded'; i++) {
      if (!scheduler.step()) break;
    }
    expect(session.getView().phase).toBe('matchEnded');
    expect(session.getView().result).not.toBeNull();
    expect(notifications).toBeGreaterThan(100);
    expect(sawDiscard).toBe(true);
    session.dispose();
  });

  it('estouro do tempo descarta a peça comprada; o banco é descontado', () => {
    const scheduler = new ManualScheduler();
    const seats: SeatSetup[] = [{ kind: 'human', name: 'Eu' }, ...BOTS.slice(1)];
    const session = LocalSession.create(
      PRESET_YONMA,
      { timer: DEFAULT_TIMER, training: false },
      seats,
      0,
      {
        scheduler,
        delays: NO_DELAYS,
        seed,
        autosave: false,
      },
    );
    scheduler.step(); // início
    const view = session.getView();
    expect(view.turn).toBe(0);
    const drawn = view.drawn!;
    scheduler.advance(6000);
    expect(session.getClock()).toMatchObject({ baseMs: 0, bankMs: 19000, hasBank: true });
    scheduler.advance(19_000);
    const after = session.getView();
    expect(after.players[0]!.discards[0]!.tile.id).toBe(drawn.id);
    expect(after.players[0]!.discards[0]!.tsumogiri).toBe(true);
    session.dispose();
  });

  it('ação do humano dentro do tempo: banco preservado quando usa só a base', () => {
    const scheduler = new ManualScheduler();
    const seats: SeatSetup[] = [{ kind: 'human', name: 'Eu' }, ...BOTS.slice(1)];
    const session = LocalSession.create(
      PRESET_YONMA,
      { timer: DEFAULT_TIMER, training: false },
      seats,
      0,
      {
        scheduler,
        delays: NO_DELAYS,
        seed,
        autosave: false,
      },
    );
    scheduler.step();
    scheduler.advance(3000);
    const v = session.getView();
    session.submit({ type: 'discard', tile: v.legal.discard[0]! });
    expect(session.getClock()).toBeNull();
    expect(session.getView().players[0]!.discards).toHaveLength(1);
    session.dispose();
  });
});

describe('autosave', () => {
  const memory = (): KeyValueStore & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  };

  it('salva e carrega; versão incompatível é descartada', () => {
    const store = memory();
    const session = LocalSession.create(
      PRESET_YONMA,
      { timer: DEFAULT_TIMER, training: false },
      BOTS,
      0,
      {
        scheduler: new ManualScheduler(),
        seed,
        autosave: false,
      },
    );
    const snapshot = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: 1,
      state: session.getState(),
      settings: session.settings,
      seats: session.seats,
      localSeat: 0 as Seat,
      banks: {},
    };
    saveMatch(snapshot, store);
    const loaded = loadMatch(store);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') expect(loaded.snapshot.state).toEqual(session.getState());
    store.data.set('match:v1', JSON.stringify({ ...snapshot, schemaVersion: 999 }));
    expect(loadMatch(store).status).toBe('incompatible');
    store.data.set('match:v1', '{quebrado');
    expect(loadMatch(store).status).toBe('incompatible');
    expect(loadMatch(memory()).status).toBe('none');
    session.dispose();
  });
});
