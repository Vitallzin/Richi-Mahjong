// Salas (spec 13): anfitrião e convidado ligados por um transporte em memória (sem Firebase).
import { createMatch, PRESET_YONMA, type Action, type PlayerView, type Seat } from '../engine';
import { DEFAULT_TIMER, type TimerSettings } from './clock';
import { GuestSession, type GuestTransport } from './GuestSession';
import { HostSession } from './HostSession';
import { NO_DELAYS, type Scheduler } from './LocalSession';
import {
  generateRoomCode,
  IDLE_TURN_MS,
  isRoomCode,
  parseRoomCode,
  seatsForMatch,
  type CoverReason,
  type HostUpdate,
  type PrivatePayload,
} from './room';
import type { SeatSetup } from './types';

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
  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      this.queue.sort((a, b) => a.at - b.at || a.id - b.id);
      const next = this.queue[0];
      if (!next || next.at > target) break;
      this.queue.shift();
      this.time = Math.max(this.time, next.at);
      next.fn();
    }
    this.time = target;
  }
}

const SEATS: SeatSetup[] = [
  { kind: 'human', name: 'Anfitriã', uid: 'host' },
  { kind: 'human', name: 'Bia', uid: 'bia' },
  { kind: 'bot', skill: 'normal', characterId: 'ren' },
  { kind: 'bot', skill: 'normal', characterId: 'akari' },
];

function setup(seed = 77, timer: TimerSettings = DEFAULT_TIMER) {
  const scheduler = new ManualScheduler();
  const updates: HostUpdate[] = [];
  const seatChanges: { seats: readonly SeatSetup[]; covers: Partial<Record<Seat, CoverReason>> }[] =
    [];
  let deliver: ((p: PrivatePayload) => void) | null = null;
  const host = new HostSession({
    state: createMatch(PRESET_YONMA, seed).state,
    settings: { timer, training: false },
    seats: SEATS,
    localSeat: 0,
    scheduler,
    delays: NO_DELAYS,
    autosave: false,
    seed: () => seed,
    pick: () => 0,
    onSeats: (seats, covers) => seatChanges.push({ seats, covers }),
    transport: {
      publish: (u) => {
        updates.push(u);
        const p = u.privates['bia'];
        if (p) deliver?.(p);
      },
    },
  });
  scheduler.advance(0);
  const first = updates.at(-1)?.privates['bia'];
  if (!first) throw new Error('sem visão para o convidado');
  const sent: { action: Action; clientSeq: number }[] = [];
  const transport: GuestTransport = {
    onPrivate: (cb) => {
      deliver = cb;
      return () => {
        deliver = null;
      };
    },
    send: (action, clientSeq) => {
      sent.push({ action, clientSeq });
      host.receive({ uid: 'bia', clientSeq, action });
    },
  };
  const guest = new GuestSession({
    rules: PRESET_YONMA,
    settings: { timer: DEFAULT_TIMER, training: false },
    seats: SEATS,
    localSeat: 1,
    transport,
    initial: first,
    now: scheduler.now,
  });
  return { scheduler, updates, host, guest, sent, seatChanges };
}

/** Faz a primeira jogada legal (descarta a comprada, passa ou continua). */
function act(session: { getView(): PlayerView; submit(a: Action): void }): boolean {
  const v = session.getView();
  if (v.legal.discard.length > 0)
    session.submit({ type: 'discard', tile: v.drawn ?? v.legal.discard[0]! });
  else if (v.legal.pass) session.submit({ type: 'pass' });
  else if (v.legal.ackSummary) session.submit({ type: 'ackSummary' });
  else return false;
  return true;
}

/** Joga até o convidado ter algo a decidir (ou a mão acabar). */
function untilGuestActs(s: ReturnType<typeof setup>, maxMs = 120_000): PlayerView {
  for (let t = 0; t < maxMs; t += 500) {
    const v = s.guest.getView();
    if (v.legal.discard.length > 0 || v.legal.pass || v.legal.ackSummary) return v;
    const hv = s.host.getView();
    if (hv.legal.discard.length > 0)
      s.host.submit({ type: 'discard', tile: hv.drawn ?? hv.legal.discard[0]! });
    else if (hv.legal.pass) s.host.submit({ type: 'pass' });
    else if (hv.legal.ackSummary) s.host.submit({ type: 'ackSummary' });
    s.scheduler.advance(500);
  }
  throw new Error('o convidado nunca precisou agir');
}

describe('código da sala (spec 13.2)', () => {
  it('6 caracteres sem ambiguidade; aceita link colado e minúsculas', () => {
    let i = 0;
    const code = generateRoomCode(() => (i++ * 0.37) % 1);
    expect(isRoomCode(code)).toBe(true);
    expect(code).not.toMatch(/[01IO]/);
    expect(parseRoomCode(' abc234 ')).toBe('ABC234');
    expect(parseRoomCode('https://site/sala/HJK789')).toBe('HJK789');
    expect(parseRoomCode('ABCDE0')).toBeNull();
  });

  it('código padrão vem do crypto e não repete', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    const codes = new Set(Array.from({ length: 200 }, () => generateRoomCode()));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    expect(codes.size).toBe(200);
    for (const code of codes) expect(isRoomCode(code)).toBe(true);
  });

  it('assentos vazios viram bots com personagem', () => {
    const seats = seatsForMatch(
      [
        { type: 'human', uid: 'a', displayName: 'Ana' },
        { type: 'empty', displayName: '' },
        { type: 'bot', displayName: '', characterId: 'akari' },
      ],
      'easy',
      ['ren', 'sora'],
    );
    expect(seats).toEqual([
      { kind: 'human', name: 'Ana', uid: 'a' },
      { kind: 'bot', skill: 'easy', characterId: 'ren' },
      { kind: 'bot', skill: 'easy', characterId: 'akari' },
    ]);
  });
});

describe('anfitrião e convidado (spec 13.1 e 13.4)', () => {
  it('o convidado recebe só a própria visão e joga pelo inbox', () => {
    const s = setup();
    const v = untilGuestActs(s);
    expect(v.seat).toBe(1);
    // A visão publicada para o convidado é a do assento dele: sem mãos alheias.
    const last = s.updates.at(-1)!;
    expect(Object.keys(last.privates)).toEqual(['bia']);
    const published = JSON.parse(last.privates['bia']!.view) as PlayerView;
    expect(published.seat).toBe(1);
    expect(JSON.stringify(published)).not.toContain('"wall"');
    expect(published.hand).toHaveLength(v.hand.length);
    if (v.legal.discard.length > 0) {
      const before = s.host.getState().hand!.players[1]!.discards.length;
      s.guest.submit({ type: 'discard', tile: v.drawn ?? v.legal.discard[0]! });
      expect(s.host.getState().hand!.players[1]!.discards.length).toBe(before + 1);
    } else {
      s.guest.submit({ type: 'pass' });
    }
    expect(s.sent).toHaveLength(1);
  });

  it('mensagem repetida (mesmo clientSeq) não é aplicada duas vezes; ação ilegal vira erro leve', () => {
    const s = setup(91);
    const v = untilGuestActs(s);
    if (v.legal.discard.length === 0) return; // semente sem descarte do convidado: coberto acima
    const tile = v.drawn ?? v.legal.discard[0]!;
    s.host.receive({ uid: 'bia', clientSeq: 5, action: { type: 'discard', tile } });
    const after = s.host.getState().hand!.players[1]!.discards.length;
    s.host.receive({ uid: 'bia', clientSeq: 5, action: { type: 'discard', tile } });
    expect(s.host.getState().hand!.players[1]!.discards.length).toBe(after);
    s.host.receive({ uid: 'bia', clientSeq: 6, action: { type: 'tsumo' } });
    expect(s.updates.at(-1)!.privates['bia']!.lastError).toBeTruthy();
    expect(s.guest.getLastError()).toBeTruthy();
    // quem não está sentado não age
    s.host.receive({ uid: 'intruso', clientSeq: 99, action: { type: 'pass' } });
  });

  it('convidado ausente é coberto por bot; ao voltar, o relógio dele volta a contar', () => {
    const s = setup(5);
    untilGuestActs(s);
    s.host.setPresent('bia', false);
    expect(s.host.coveredSeats()).toEqual([1 as Seat]);
    // Sem o convidado, a mesa anda sozinha (o bot decide por ele).
    const discards = () => s.host.getState().hand?.players[1]?.discards.length ?? 0;
    const before = discards();
    for (let i = 0; i < 40 && discards() === before; i++) {
      const hv = s.host.getView();
      if (hv.legal.discard.length > 0)
        s.host.submit({ type: 'discard', tile: hv.drawn ?? hv.legal.discard[0]! });
      else if (hv.legal.pass) s.host.submit({ type: 'pass' });
      s.scheduler.advance(500);
    }
    expect(discards()).toBeGreaterThan(before);
    s.host.setPresent('bia', true);
    expect(s.host.coveredSeats()).toEqual([]);
  });

  it('relógio do convidado chega como tempo restante e conta a partir do recebimento', () => {
    const s = setup(13);
    const v = untilGuestActs(s);
    if (v.legal.ackSummary) return;
    const clock = s.guest.getClock();
    expect(clock).toMatchObject({ seat: 1, hasBank: true });
    expect(clock!.baseMs).toBeGreaterThan(0);
    s.scheduler.advance(2000);
    expect(s.guest.getClock()!.baseMs).toBeLessThanOrEqual(clock!.baseMs - 2000 + 1);
  });
});

describe('bot no lugar de quem sai, fica parado ou entra depois (ADR 0020)', () => {
  it('quem sai fica marcado como coberto nos assentos; ao voltar, o bot sai', () => {
    const s = setup(5);
    untilGuestActs(s);
    s.host.setPresent('bia', false);
    expect(s.host.coverOf(1)).toBe('away');
    expect(s.seatChanges.at(-1)?.covers).toEqual({ 1: 'away' });
    s.host.setPresent('bia', true);
    expect(s.host.coverOf(1)).toBeNull();
    expect(s.seatChanges.at(-1)?.covers).toEqual({});
  });

  it('tempo ilimitado: parado demais ⇒ bot assume; agir de novo devolve o assento', () => {
    const s = setup(5, { mode: 'unlimited' });
    const v = untilGuestActs(s);
    expect(v.legal.ackSummary).toBe(false);
    // A decisão começou até 500 ms antes (untilGuestActs anda de meio em meio segundo).
    s.scheduler.advance(IDLE_TURN_MS - 600);
    expect(s.host.coverOf(1)).toBeNull();
    s.scheduler.advance(600);
    expect(s.host.coverOf(1)).toBe('idle');
    expect(s.seatChanges.at(-1)?.covers).toEqual({ 1: 'idle' });
    // Reconectar não tira o bot de quem estava parado; agir tira.
    s.host.setPresent('bia', true);
    expect(s.host.coverOf(1)).toBe('idle');
    // Qualquer ação do convidado (mesmo atrasada e recusada) mostra que ele voltou.
    s.guest.submit({ type: 'pass' });
    expect(s.host.coverOf(1)).toBeNull();
    expect(s.seatChanges.at(-1)?.covers).toEqual({});
  });

  it('com relógio: estouros seguidos ⇒ bot assume; "voltar a jogar" tira o bot', () => {
    const s = setup(5);
    for (let i = 0; i < 12 && !s.host.coverOf(1); i++) {
      const v = untilGuestActs(s);
      if (v.legal.ackSummary) s.guest.submit({ type: 'ackSummary' });
      else s.scheduler.advance(30_000);
    }
    expect(s.host.coverOf(1)).toBe('idle');
    s.host.resume('bia');
    expect(s.host.coverOf(1)).toBeNull();
  });

  it('o próprio anfitrião parado também é coberto; jogar o devolve', () => {
    const s = setup(9, { mode: 'unlimited' });
    for (let i = 0; i < 400 && !s.host.getView().legal.discard.length; i++) {
      act(s.guest);
      s.scheduler.advance(500);
    }
    s.scheduler.advance(IDLE_TURN_MS);
    expect(s.host.coverOf(0)).toBe('idle');
    s.host.resume();
    expect(s.host.coverOf(0)).toBeNull();
  });

  it('quem entra com a partida em andamento assume um bot na mão seguinte', () => {
    const s = setup(21, { mode: 'unlimited' });
    s.host.queueJoin({ kind: 'human', name: 'Caio', uid: 'caio' });
    expect(s.host.isWaiting('caio')).toBe(true);
    // Na mão atual nada muda.
    expect(s.host.seats[2]).toMatchObject({ kind: 'bot' });
    for (let i = 0; i < 3000 && s.host.isWaiting('caio'); i++) {
      act(s.host);
      act(s.guest);
      s.scheduler.advance(500);
    }
    expect(s.host.isWaiting('caio')).toBe(false);
    expect(s.host.getState().handsPlayed).toBeGreaterThan(0);
    expect(s.host.seats[2]).toEqual({ kind: 'human', name: 'Caio', uid: 'caio' });
    expect(s.seatChanges.at(-1)?.seats[2]).toMatchObject({ uid: 'caio' });
    // Ele passa a receber a própria visão, do assento novo.
    const view = JSON.parse(s.updates.at(-1)!.privates['caio']!.view) as PlayerView;
    expect(view.seat).toBe(2);
  });

  it('quem sai da sala antes da vez dele deixa a fila', () => {
    const s = setup(21);
    s.host.queueJoin({ kind: 'human', name: 'Caio', uid: 'caio' });
    s.host.setPresent('caio', false);
    expect(s.host.isWaiting('caio')).toBe(false);
  });
});
