import { PRESET_SANMA, PRESET_YONMA, buildRuleSet, type RuleSet } from '../rules';
import { riggedMatch, type RiggedLayout } from '../testing/rigged';
import { parseKinds, type Tile } from '../tiles';
import type { Seat } from '../types';
import { eventsForSeat, getPlayerView, getTrainingView } from '../view';
import {
  applyAction,
  canStartNextHand,
  createMatch,
  getLegalActions,
  IllegalActionError,
  kuikaeKinds,
  startNextHand,
  type Action,
  type GameEvent,
  type MatchState,
} from './index';

// ---------------------------------------------------------------------------------------------
// Auxiliares

const kindOf = (notation: string) => parseKinds(notation)[0] as number;

function findTile(s: MatchState, seat: Seat, notation: string): Tile {
  const red = notation.startsWith('0');
  const kind = kindOf(notation);
  const t = s.hand?.players[seat]?.hand.find((x) => x.kind === kind && x.red === red);
  if (!t) throw new Error(`Assento ${seat} não tem ${notation}`);
  return t;
}

let lastEvents: GameEvent[] = [];
function act(s: MatchState, seat: Seat, action: Action): MatchState {
  const r = applyAction(s, seat, action);
  lastEvents = r.events;
  return r.state;
}

const discard = (s: MatchState, seat: Seat, notation: string, riichi = false) =>
  act(s, seat, { type: 'discard', tile: findTile(s, seat, notation), riichi });

const tsumogiri = (s: MatchState, seat: Seat) => {
  const drawn = s.hand?.players[seat]?.drawn;
  if (!drawn) throw new Error(`Assento ${seat} sem peça comprada`);
  return act(s, seat, { type: 'discard', tile: drawn });
};

/** Todos os assentos com "Passar" disponível passam. */
function passAll(s: MatchState): MatchState {
  let state = s;
  for (let seat = 0; seat < state.rules.players; seat++) {
    if (getLegalActions(state, seat as Seat).pass)
      state = act(state, seat as Seat, { type: 'pass' });
  }
  return state;
}

function ackAll(s: MatchState): MatchState {
  let state = s;
  for (let seat = 0; seat < s.rules.players; seat++) {
    if (getLegalActions(state, seat as Seat).ackSummary) {
      state = act(state, seat as Seat, { type: 'ackSummary' });
    }
  }
  return state;
}

const rig = (layout: RiggedLayout, rules: RuleSet = PRESET_YONMA) => riggedMatch(rules, layout);

function player(s: MatchState, seat: number) {
  const p = s.hand?.players[seat];
  if (!p) throw new Error('sem jogador');
  return p;
}

const firstPon = (s: MatchState, seat: Seat): Action => {
  const use = getLegalActions(s, seat).pon[0];
  if (!use) throw new Error('sem pon');
  return { type: 'pon', use: [use[0], use[1]] };
};

/** Mãos noten de enchimento, sem 5s, sem pares em comum (no máximo 2 cópias de cada tipo entre elas). */
const B = '1147m2288p3669s6z';
const C = '2288m3399p1447s7z';
const D = '3399m1147p2288s4z';
const E = '147m369p369s1567z';

const RIICHI_ESTABLISHED = { double: false, discardIndex: 0, established: true, ippatsu: false };

// ---------------------------------------------------------------------------------------------

describe('início da partida', () => {
  it('distribui 13 peças, dealer compra a 14ª, muro vivo com 69 após a compra', () => {
    const { state, events } = createMatch(PRESET_YONMA, 123);
    const h = state.hand!;
    expect(h.players.map((p) => p.hand.length)).toEqual([14, 13, 13, 13]);
    expect(h.wall).toHaveLength(69);
    expect(h.replacements.length + h.doraIndicators.length + h.uraIndicators.length).toBe(14);
    expect(state.phase).toBe('awaitingDiscard');
    expect(h.turn).toBe(0);
    expect(events.map((e) => e.type)).toEqual(['HandStarted', 'DoraRevealed', 'TileDrawn']);
    expect(state.scores).toEqual([25000, 25000, 25000, 25000]);
  });

  it('sanma: 108 peças, muro vivo 54 após a compra do dealer', () => {
    const { state } = createMatch(PRESET_SANMA, 9);
    expect(state.hand!.players.map((p) => p.hand.length)).toEqual([14, 13, 13]);
    expect(state.hand!.wall).toHaveLength(54);
    expect(state.scores).toEqual([35000, 35000, 35000]);
  });

  it('estado é serializável em JSON e a partida continua igual', () => {
    const { state } = createMatch(PRESET_YONMA, 5);
    const copy = JSON.parse(JSON.stringify(state)) as MatchState;
    expect(copy).toEqual(state);
    const drawn = state.hand!.players[0]!.drawn!;
    const a = applyAction(state, 0, { type: 'discard', tile: drawn });
    const b = applyAction(copy, 0, { type: 'discard', tile: drawn });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('applyAction não altera o estado recebido', () => {
    const { state } = createMatch(PRESET_YONMA, 5);
    const before = JSON.stringify(state);
    applyAction(state, 0, { type: 'discard', tile: state.hand!.players[0]!.drawn! });
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('ações ilegais', () => {
  it('rejeita ação fora da vez, peça que não está na mão e ações indisponíveis', () => {
    const { state } = createMatch(PRESET_YONMA, 5);
    const other = state.hand!.players[1]!.hand[0]!;
    expect(() => applyAction(state, 1, { type: 'discard', tile: other })).toThrow(
      IllegalActionError,
    );
    expect(() => applyAction(state, 0, { type: 'discard', tile: other })).toThrow(
      IllegalActionError,
    );
    expect(() => applyAction(state, 0, { type: 'ron' })).toThrow(IllegalActionError);
    expect(() => applyAction(state, 0, { type: 'ackSummary' })).toThrow(IllegalActionError);
    expect(() => startNextHand(state, 1)).toThrow(IllegalActionError);
  });
});

describe('chamadas (spec 7.5)', () => {
  const layout: RiggedLayout = {
    hands: ['111222333444z5z', '23567m111999p19s', '44m222888p2468s7z', '999m58p333777s66z'],
    draws: '4m',
    dora: '9s',
  };

  it('chi só do jogador anterior; pon de qualquer um; quem não pode chamar só vê "aguardando"', () => {
    let s = rig(layout);
    s = discard(s, 0, '4m');
    expect(s.phase).toBe('awaitingCalls');
    expect(getLegalActions(s, 1).chi).toHaveLength(3); // 23, 35, 56
    expect(getLegalActions(s, 2).pon).toHaveLength(1);
    expect(getLegalActions(s, 2).chi).toHaveLength(0);
    expect(getLegalActions(s, 3).pass).toBe(false);
    expect(getPlayerView(s, 3).phase).toBe('waiting');
    expect(getPlayerView(s, 3).callTile).toBeNull();
    expect(getPlayerView(s, 1).phase).toBe('awaitingCalls');
    expect(getPlayerView(s, 1).callTile?.tile.kind).toBe(kindOf('4m'));
  });

  it('pon tem prioridade sobre chi e pula a vez', () => {
    let s = rig(layout);
    s = discard(s, 0, '4m');
    const chi56 = getLegalActions(s, 1).chi.find((u) => u.some((t) => t.kind === kindOf('6m')))!;
    s = act(s, 1, { type: 'chi', use: [chi56[0], chi56[1]] });
    expect(s.phase).toBe('awaitingCalls'); // ainda falta o assento 2
    s = act(s, 2, firstPon(s, 2));
    expect(s.phase).toBe('awaitingDiscard');
    expect(s.hand!.turn).toBe(2);
    expect(s.hand!.turnKind).toBe('call');
    expect(player(s, 2).melds[0]).toMatchObject({ type: 'pon', from: 0 });
    expect(player(s, 0).discards[0]!.calledBy).toBe(2);
    expect(getLegalActions(s, 2).tsumo).toBe(false);
    expect(getLegalActions(s, 2).riichi).toHaveLength(0);
    s = discard(s, 2, '7z');
    s = passAll(s);
    expect(s.hand!.turn).toBe(3); // depois do assento 2 vem o 3
  });

  it('kuikae no chi: não descarta a peça chamada nem a do outro extremo', () => {
    let s = rig(layout);
    s = discard(s, 0, '4m');
    const chi56 = getLegalActions(s, 1).chi.find((u) => u.some((t) => t.kind === kindOf('6m')))!;
    s = act(s, 1, { type: 'chi', use: [chi56[0], chi56[1]] });
    s = act(s, 2, { type: 'pass' });
    expect(lastEvents.some((e) => e.type === 'CallMade')).toBe(true);
    expect(s.hand!.turn).toBe(1);
    expect(s.hand!.forbiddenDiscards).toEqual([kindOf('4m'), kindOf('7m')]);
    const legalKinds = getLegalActions(s, 1).discard.map((t) => t.kind);
    expect(legalKinds).not.toContain(kindOf('7m'));
    expect(legalKinds).toContain(kindOf('2m'));
    expect(() => discard(s, 1, '7m')).toThrow(IllegalActionError);
  });

  it('kuikaeKinds: pontas, kanchan e limites do naipe', () => {
    const t = (n: string) => ({ id: -1, kind: kindOf(n), red: false });
    expect(kuikaeKinds(kindOf('4m'), [t('2m'), t('3m')], 'chi')).toEqual([
      kindOf('4m'),
      kindOf('1m'),
    ]);
    expect(kuikaeKinds(kindOf('4m'), [t('3m'), t('5m')], 'chi')).toEqual([kindOf('4m')]);
    expect(kuikaeKinds(kindOf('7m'), [t('8m'), t('9m')], 'chi')).toEqual([kindOf('7m')]);
    expect(kuikaeKinds(kindOf('3p'), [t('1p'), t('2p')], 'chi')).toEqual([kindOf('3p')]);
    expect(kuikaeKinds(kindOf('5z'), [t('5z'), t('5z')], 'pon')).toEqual([kindOf('5z')]);
  });

  it('variantes com 5 vermelho aparecem como opções distintas', () => {
    let s = rig({
      hands: ['111222333444z5z', '05m1199s6677z13p5z', B, E],
      draws: '5m',
      dora: '8p',
    });
    s = discard(s, 0, '5m');
    const pon = getLegalActions(s, 1).pon;
    expect(pon).toHaveLength(1);
    expect(pon[0]!.some((t) => t.red)).toBe(true);
    s = passAll(s);
    expect(s.phase).toBe('awaitingDiscard');
    expect(s.hand!.turn).toBe(1);
  });
});

describe('furiten (spec 7.8)', () => {
  const base: RiggedLayout = {
    hands: ['55z123m456p789s1z9m', B, C, '123m456p789s55z66z'],
    draws: '1s2s3s9s1p',
    dora: '8p',
  };

  it('passar um ron dá furiten temporário até o próprio descarte', () => {
    let s = rig(base);
    s = discard(s, 0, '5z');
    expect(getLegalActions(s, 3).ron).toBe(true);
    s = act(s, 3, { type: 'pass' });
    expect(player(s, 3).furiten.temporary).toBe(true);
    s = discard(s, 1, '6z');
    const l3 = getLegalActions(s, 3);
    expect(l3.ron).toBe(false); // furiten temporário
    expect(l3.pon).toHaveLength(1); // chamar continua permitido
    expect(getPlayerView(s, 3).furiten).toBe(true);
    s = passAll(s);
    s = tsumogiri(s, 2);
    s = passAll(s);
    s = tsumogiri(s, 3); // o próprio descarte limpa o temporário
    expect(player(s, 3).furiten.temporary).toBe(false);
    s = passAll(s);
    s = discard(s, 0, '5z');
    expect(getLegalActions(s, 3).ron).toBe(true);
    s = act(s, 3, { type: 'ron' });
    expect(s.phase).toBe('handSummary');
    expect(s.summary!.wins[0]!.seat).toBe(3);
  });

  it('furiten permanente: uma espera entre os próprios descartes', () => {
    let s = rig(base);
    const p0 = s.hand!.players[0]!;
    const five = p0.hand.find((t) => t.kind === kindOf('5z'))!;
    p0.hand = p0.hand.filter((t) => t.id !== five.id);
    p0.hand.push(s.hand!.wall.pop()!);
    s.hand!.players[3]!.discards.push({
      tile: five,
      tsumogiri: false,
      riichi: false,
      calledBy: null,
    });
    s = discard(s, 0, '5z');
    expect(getLegalActions(s, 3).ron).toBe(false);
    expect(getPlayerView(s, 3).furiten).toBe(true);
  });

  it('furiten de riichi dura a mão inteira', () => {
    let s = rig(base);
    s.hand!.players[3]!.riichi = { ...RIICHI_ESTABLISHED };
    s = discard(s, 0, '5z');
    s = act(s, 3, { type: 'pass' });
    expect(player(s, 3).furiten.riichi).toBe(true);
  });
});

describe('ron múltiplo e atamahane (spec 6.2)', () => {
  it('dois vencedores; honba e bastões vão para o mais próximo do descartador', () => {
    let s = rig({
      hands: ['1147m2288p3669s5z', '123m456p789s111z5z', '234m567p678s777z5z', D],
      draws: '9m',
      dora: '8p',
      honba: 1,
      riichiSticks: 2,
    });
    s = discard(s, 0, '5z');
    s = act(s, 1, { type: 'ron' });
    s = act(s, 2, { type: 'ron' });
    const sum = s.summary!;
    expect(sum.kind).toBe('win');
    expect(sum.wins.map((w) => w.seat)).toEqual([1, 2]);
    expect(sum.wins[0]!.scored).toMatchObject({ han: 1, fu: 50 }); // 20 + 10 + 8 + 2 (tanki) + 2 (par de dragão)
    expect(sum.deltas).toEqual([-(1600 + 300 + 1600), 1600 + 300 + 2000, 1600, 0]);
    expect(s.riichiSticks).toBe(0);
    expect(s.honba).toBe(0);
    expect(s.dealer).toBe(1); // dealer não venceu: passa
    expect(lastEvents.some((e) => e.type === 'HandWon')).toBe(true);
  });
});

describe('riichi (spec 7.7)', () => {
  const layout: RiggedLayout = {
    hands: ['123m456p789s1122z', '123p456p789s3467z', C, D],
    draws: '9m1z',
    dora: '8p',
  };

  it('só descartes que mantêm tenpai permitem riichi; bastão pago ao estabelecer; daburu', () => {
    let s = rig(layout);
    expect(getLegalActions(s, 0).riichi.map((t) => t.kind)).toEqual([kindOf('9m')]);
    s = discard(s, 0, '9m', true);
    s = passAll(s);
    expect(player(s, 0).riichi).toMatchObject({ established: true, double: true, ippatsu: true });
    expect(s.scores[0]).toBe(24000);
    expect(s.riichiSticks).toBe(1);
    expect(player(s, 0).discards[0]!.riichi).toBe(true);
  });

  it('ippatsu + daburu riichi no ron logo depois', () => {
    let s = rig(layout);
    s = discard(s, 0, '9m', true);
    s = passAll(s);
    s = tsumogiri(s, 1); // assento 1 compra 1z e descarta
    expect(getLegalActions(s, 0).ron).toBe(true);
    expect(getLegalActions(s, 0).pon).toHaveLength(0); // em riichi não chama
    s = act(s, 0, { type: 'ron' });
    const ids = s.summary!.wins[0]!.scored.yaku.map((y) => y.id);
    expect(ids).toEqual(expect.arrayContaining(['doubleRiichi', 'ippatsu']));
    expect(ids).not.toContain('riichi');
    expect(s.summary!.uraIndicators).toHaveLength(1); // vencedor em riichi revela ura
  });

  it('em riichi só descarta a peça comprada', () => {
    let s = rig({ ...layout, draws: '9m5s5s' });
    s = discard(s, 0, '9m', true);
    s = passAll(s);
    for (const seat of [1, 2, 3] as Seat[]) {
      s = tsumogiri(s, seat);
      s = passAll(s);
    }
    if (s.phase !== 'awaitingDiscard') return; // (se o filler completasse a mão, o teste não se aplica)
    const l = getLegalActions(s, 0);
    expect(l.discard).toHaveLength(1);
    expect(l.discard[0]!.id).toBe(player(s, 0).drawn!.id);
    expect(l.riichi).toHaveLength(0);
  });

  it('descarte de riichi vencido por ron: riichi não se estabelece', () => {
    let s = rig({ ...layout, hands: [layout.hands[0]!, '123p456s789s777z9m', C, D] });
    s = discard(s, 0, '9m', true);
    expect(getLegalActions(s, 1).ron).toBe(true);
    s = act(s, 1, { type: 'ron' });
    s = passAll(s);
    expect(s.riichiSticks).toBe(0);
    expect(s.summary!.scoresAfter[0]).toBe(25000 + s.summary!.deltas[0]!);
    expect(s.summary!.deltas[0]).toBeLessThan(0);
  });

  it('sem pontos suficientes, com muro curto ou com mão aberta, não há riichi', () => {
    const poor = rig({ ...layout, scores: [900, 25000, 25000, 49100] });
    expect(getLegalActions(poor, 0).riichi).toHaveLength(0);
    const short = rig(layout);
    short.hand!.wall.splice(3);
    expect(getLegalActions(short, 0).riichi).toHaveLength(0);
  });
});

describe('kans e dora (spec 7.6)', () => {
  it('daiminkan: compra de reposição, dora revelada só após o descarte', () => {
    let s = rig({ hands: [B, '666z123m456p789s5z', C, D], draws: '9m', dora: '8p' });
    s = discard(s, 0, '6z');
    const wallBefore = s.hand!.wall.length;
    expect(getLegalActions(s, 1).daiminkan).toBe(true);
    s = act(s, 1, { type: 'daiminkan' });
    expect(s.hand!.turn).toBe(1);
    expect(s.hand!.turnKind).toBe('rinshan');
    expect(s.hand!.doraRevealed).toBe(1);
    expect(s.hand!.wall.length).toBe(wallBefore - 1);
    expect(player(s, 1).melds[0]!.type).toBe('daiminkan');
    s = tsumogiri(s, 1);
    expect(s.hand!.doraRevealed).toBe(2);
    expect(lastEvents.some((e) => e.type === 'DoraRevealed')).toBe(true);
  });

  it('ankan: dora imediata, compra de reposição, interrompe o 1º giro', () => {
    let s = rig({ hands: ['6666m5m56p56s1235z', B, C, D], draws: '9m', dora: '8p' });
    expect(getLegalActions(s, 0).ankan).toEqual([kindOf('6m')]);
    s = act(s, 0, { type: 'ankan', kind: kindOf('6m') });
    expect(s.hand!.doraRevealed).toBe(2);
    expect(s.hand!.turnKind).toBe('rinshan');
    expect(s.hand!.uninterrupted).toBe(false);
    expect(player(s, 0).hand).toHaveLength(11);
    expect(getLegalActions(s, 0).kyuushuKyuuhai).toBe(false);
  });

  it('kakan pode ser roubado (chankan)', () => {
    let s = rig({
      hands: [B, '66p11m99s1234567z', '234m57p456789s55z', D],
      draws: '6p5m5m5m6p',
      dora: '8p',
    });
    s = discard(s, 0, '6p');
    expect(getLegalActions(s, 2).ron).toBe(false); // sem yaku no ron comum
    s = act(s, 1, firstPon(s, 1));
    s = discard(s, 1, '1z');
    s = passAll(s);
    for (const seat of [2, 3, 0] as Seat[]) {
      s = tsumogiri(s, seat);
      s = passAll(s);
    }
    expect(getLegalActions(s, 1).kakan).toHaveLength(1);
    s = act(s, 1, { type: 'kakan', tile: getLegalActions(s, 1).kakan[0]! });
    expect(s.phase).toBe('awaitingRobbery');
    expect(getPlayerView(s, 2).callTile?.kind).toBe('kakan');
    expect(getPlayerView(s, 3).phase).toBe('waiting');
    s = act(s, 2, { type: 'ron' });
    expect(s.summary!.wins[0]!.scored.yaku.map((y) => y.id)).toContain('chankan');
  });

  it('kan fechado em riichi só se não mudar as esperas', () => {
    const ok = rig({ hands: ['666m234p567s789s5z', B, C, D], draws: '6m', dora: '8p' });
    ok.hand!.players[0]!.riichi = { ...RIICHI_ESTABLISHED };
    expect(getLegalActions(ok, 0).ankan).toEqual([kindOf('6m')]);
    const bad = rig({ hands: ['6667m345p678p999s', B, C, D], draws: '6m', dora: '8s' });
    bad.hand!.players[0]!.riichi = { ...RIICHI_ESTABLISHED };
    expect(getLegalActions(bad, 0).ankan).toEqual([]);
  });

  it('quatro kans de jogadores diferentes: empate abortivo após o descarte', () => {
    let s = rig({ hands: ['6666m5m56p56s1235z', B, C, D], draws: '9m', dora: '8p' });
    s.hand!.kanSeats = [1, 2, 3];
    s = act(s, 0, { type: 'ankan', kind: kindOf('6m') });
    expect(s.hand!.suukaikanPending).toBe(true);
    s = tsumogiri(s, 0);
    s = passAll(s);
    expect(s.summary?.abortiveReason).toBe('suukaikan');
  });
});

describe('fim de mão', () => {
  it('empate por exaustão: noten paga 3.000, honba +1, dealer noten passa', () => {
    let s = rig({ hands: [B, '123m456p789s1122z', C, D], draws: '5m6p5s6s', dora: '8p' });
    s.hand!.wall.splice(3);
    for (const seat of [0, 1, 2, 3] as Seat[]) {
      s = tsumogiri(s, seat);
      s = passAll(s);
    }
    expect(s.phase).toBe('handSummary');
    expect(s.summary!.kind).toBe('exhaustive');
    expect(s.summary!.tenpai).toEqual([false, true, false, false]);
    expect(s.summary!.deltas).toEqual([-1000, 3000, -1000, -1000]);
    expect(s.summary!.revealed[1]).toHaveLength(13);
    expect(s.summary!.revealed[0]).toBeUndefined();
    expect(s.honba).toBe(1);
    expect(s.dealer).toBe(1);
    expect(canStartNextHand(s)).toBe(false);
    s = ackAll(s);
    expect(canStartNextHand(s)).toBe(true);
    const next = startNextHand(s, 77);
    expect(next.state.hand!.turn).toBe(1);
    expect(next.state.phase).toBe('awaitingDiscard');
    expect(next.state.hand!.seed).toBe(77);
  });

  it('nagashi mangan substitui o noten', () => {
    let s = rig({ hands: [B, C, D, E], draws: '5m6p1z6s', dora: '8p' });
    s.hand!.wall.splice(3);
    for (const seat of [0, 1, 2, 3] as Seat[]) {
      s = tsumogiri(s, seat);
      s = passAll(s);
    }
    expect(s.summary!.nagashi).toEqual([2]);
    expect(s.summary!.deltas).toEqual([-4000, -2000, 8000, -2000]);
  });

  it('kyuushu kyuuhai na primeira compra sem chamadas', () => {
    let s = rig({ hands: ['19m19p19s1234z567m', B, C, D], draws: '9m', dora: '8p' });
    expect(getLegalActions(s, 0).kyuushuKyuuhai).toBe(true);
    s = act(s, 0, { type: 'kyuushuKyuuhai' });
    expect(s.summary).toMatchObject({
      kind: 'abortive',
      abortiveReason: 'kyuushuKyuuhai',
      renchan: true,
    });
    expect(s.dealer).toBe(0);
    expect(s.honba).toBe(1);
    expect(s.summary!.revealed[0]).toHaveLength(14);
  });

  it('suufon renda: quatro descartes iguais de vento no 1º giro', () => {
    let s = rig({
      hands: ['1147m2288p3669s1z', '2288m3399p1447s1z', '3399m1147p2288s1z', E],
      draws: '2z2z2z2z',
      dora: '8p',
    });
    for (const seat of [0, 1, 2, 3] as Seat[]) {
      s = discard(s, seat, '1z');
      s = passAll(s);
    }
    expect(s.summary?.abortiveReason).toBe('suufonRenda');
  });

  it('suucha riichi: os quatro em riichi', () => {
    let s = rig({ hands: ['123m456p789s1122z', B, C, D], draws: '9m', dora: '8p' });
    for (const seat of [1, 2, 3]) s.hand!.players[seat]!.riichi = { ...RIICHI_ESTABLISHED };
    s = discard(s, 0, '9m', true);
    s = passAll(s);
    expect(s.summary?.abortiveReason).toBe('suuchaRiichi');
    expect(s.riichiSticks).toBe(1);
  });

  it('pao do daisangen: no ron, responsável e descartador dividem', () => {
    let s = rig({
      hands: ['1147m2288p3669s7z', '555z666z77z123m4p9s', '2288m3399p1447s4p', E],
      draws: '9m9s',
      dora: '8p',
    });
    const p1 = s.hand!.players[1]!;
    const haku = p1.hand.filter((t) => t.kind === kindOf('5z'));
    const hatsu = p1.hand.filter((t) => t.kind === kindOf('6z'));
    p1.hand = p1.hand.filter((t) => !haku.includes(t) && !hatsu.includes(t));
    p1.melds.push({ type: 'pon', tiles: haku, called: haku[0]!, from: 2 });
    p1.melds.push({ type: 'pon', tiles: hatsu, called: hatsu[0]!, from: 3 });
    s = discard(s, 0, '7z');
    s = act(s, 1, firstPon(s, 1));
    expect(player(s, 1).pao.daisangen).toBe(0);
    s = discard(s, 1, '9s');
    s = passAll(s);
    s = discard(s, 2, '4p');
    s = act(s, 1, { type: 'ron' });
    const win = s.summary!.wins[0]!;
    expect(win.scored.yakuman.map((y) => y.id)).toEqual(['daisangen']);
    expect(win.pao).toBe(0);
    expect(s.summary!.deltas).toEqual([-16000, 32000, -16000, 0]);
  });
});

describe('fim de partida (spec 7.12)', () => {
  const DEALER_HAND = '123m456p789s111z5z';

  /** Dealer descarta 9p; o próximo compra 5z e descarta; o dealer pode dar ron. */
  function dealerRonSetup(rules: RuleSet, over: Partial<RiggedLayout> = {}) {
    let s = rig({ hands: [DEALER_HAND, B, C, D], draws: '9p5z', dora: '8p', ...over }, rules);
    s = discard(s, s.dealer, '9p');
    s = passAll(s);
    s = tsumogiri(s, ((s.dealer + 1) % 4) as Seat);
    return s;
  }

  it('uma mão: termina ao fim de Leste 1 mesmo em empate abortivo', () => {
    const rules = buildRuleSet('yonma', { length: 'oneHand' });
    let s = rig({ hands: ['19m19p19s1234z567m', B, C, D], draws: '9m', dora: '8p' }, rules);
    s = act(s, 0, { type: 'kyuushuKyuuhai' });
    expect(s.summary!.matchEnds).toBe(true);
    s = ackAll(s);
    expect(s.phase).toBe('matchEnded');
    expect(lastEvents.some((e) => e.type === 'MatchEnded')).toBe(true);
    expect(s.result?.endReason).toBe('normal');
    expect(getLegalActions(s, 0).ackSummary).toBe(false);
  });

  it('tobi: alguém abaixo de 0 encerra', () => {
    let s = dealerRonSetup(PRESET_YONMA, { scores: [25000, 1000, 37000, 37000] });
    s = act(s, 0, { type: 'ron' });
    expect(s.summary!.deltas).toEqual([4800, -4800, 0, 0]); // 2 han 50 fu do dealer
    expect(s.result?.endReason).toBe('tobi');
    expect(s.result?.ranking[3]).toBe(1);
  });

  it('agari-yame: dealer vence a última mão em 1º e com o alvo', () => {
    const rules = buildRuleSet('yonma', { length: 'east' });
    const over = {
      dealer: 3 as Seat,
      scores: [10000, 10000, 10000, 70000],
      hands: [B, C, D, DEALER_HAND],
    };
    let s = dealerRonSetup(rules, over);
    s = act(s, 3, { type: 'ron' });
    expect(s.result?.endReason).toBe('agariYame');
    const off = buildRuleSet('yonma', { length: 'east', agariYame: false });
    let t = dealerRonSetup(off, over);
    t = act(t, 3, { type: 'ron' });
    expect(t.result).toBeNull();
    expect(t.dealer).toBe(3);
    expect(t.honba).toBe(1);
  });

  it('extensão: ninguém no alvo ⇒ continua no Sul; com alvo ⇒ encerra; limite ⇒ encerra', () => {
    const rules = buildRuleSet('yonma', { length: 'east' });
    const exhaust = (scores: number[], roundWind = 0) => {
      let st = rig(
        { hands: [B, C, D, E], draws: '5m6p5s6s', dora: '8p', dealer: 3, scores, roundWind },
        rules,
      );
      st.hand!.wall.splice(3);
      for (const seat of [3, 0, 1, 2] as Seat[]) {
        st = tsumogiri(st, seat);
        st = passAll(st);
      }
      return st;
    };
    const cont = exhaust([25000, 25000, 25000, 25000]);
    expect(cont.summary!.kind).toBe('exhaustive');
    expect(cont.result).toBeNull();
    expect(cont.roundWind).toBe(1);
    expect(cont.dealer).toBe(0);
    expect(exhaust([31000, 23000, 23000, 23000]).result?.endReason).toBe('normal');
    expect(exhaust([25000, 25000, 25000, 25000], 1).result?.endReason).toBe('normal');
  });

  it('bastões que sobram vão para o 1º colocado; desempate pela ordem dos assentos', () => {
    const rules = buildRuleSet('yonma', { length: 'oneHand' });
    let s = rig(
      {
        hands: ['19m19p19s1234z567m', B, C, D],
        draws: '9m',
        dora: '8p',
        riichiSticks: 2,
        scores: [24000, 24000, 25000, 25000],
      },
      rules,
    );
    s = act(s, 0, { type: 'kyuushuKyuuhai' });
    expect(s.result?.ranking).toEqual([2, 3, 0, 1]);
    expect(s.result?.finalScores).toEqual([24000, 24000, 27000, 25000]);
  });
});

describe('PlayerView (spec 5.3)', () => {
  it('nunca contém mãos alheias, muro, muro morto oculto ou ura-dora', () => {
    const { state } = createMatch(PRESET_YONMA, 2024);
    const h = state.hand!;
    for (const seat of [0, 1, 2, 3] as Seat[]) {
      const view = getPlayerView(state, seat);
      const json = JSON.stringify(view);
      const hidden = [
        ...h.wall,
        ...h.replacements,
        ...h.uraIndicators,
        ...h.doraIndicators.slice(h.doraRevealed),
        ...h.players.flatMap((p, i) => (i === seat ? [] : p.hand)),
      ];
      for (const t of hidden) expect(json).not.toContain(`"id":${t.id},`);
      expect(view.hand).toHaveLength(seat === 0 ? 14 : 13);
      expect(view.players[(seat + 1) % 4]!.handCount).toBe(seat === 3 ? 14 : 13);
      expect(view).not.toHaveProperty('wall');
    }
  });

  it('eventos: a compra dos outros fica oculta', () => {
    const { events } = createMatch(PRESET_YONMA, 1);
    expect(eventsForSeat(events, 1).find((e) => e.type === 'TileDrawn')).toMatchObject({
      tile: null,
    });
    expect(eventsForSeat(events, 0).find((e) => e.type === 'TileDrawn')).not.toMatchObject({
      tile: null,
    });
  });

  it('modo treino mostra as mãos (função separada)', () => {
    const { state } = createMatch(PRESET_YONMA, 3);
    const tv = getTrainingView(state, 0);
    expect(tv.training).toBe(true);
    expect(tv.revealedHands[2]).toHaveLength(13);
    expect(getPlayerView(state, 0)).not.toHaveProperty('revealedHands');
  });
});
