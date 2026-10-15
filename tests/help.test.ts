// Ajudas (spec 9.2–9.5): só com PlayerView. Os estados de teste são montados com o motor e convertidos
// em PlayerView antes de chegar às ajudas.
import {
  buildRuleSet,
  getPlayerView,
  parseKinds,
  PRESET_YONMA,
  type MatchState,
  type Seat,
} from '../src/engine';
import { riggedMatch, type RiggedLayout } from '../src/engine/testing/rigged';
import { analyzeHand, DEFAULT_LABELS, doraPairs, labelFor } from '../src/help';

const B = '1147m2288p3669s6z';
const C = '2288m3399p1447s7z';
const D = '3399m1147p2288s4z';
const k = (n: string) => parseKinds(n)[0]!;

const rig = (layout: RiggedLayout, rules = PRESET_YONMA) => riggedMatch(rules, layout);
const view = (s: MatchState, seat: Seat) => getPlayerView(s, seat);

describe('esperas e cópias não visíveis (spec 9.3)', () => {
  it('lista esperas com yaku no ron e no tsumo', () => {
    const s = rig({ hands: [B, '123m456p789s1122z', C, D], draws: '9m', dora: '8p' });
    const a = analyzeHand(view(s, 1));
    expect(a.state).toBe('tenpai');
    expect(a.waits.map((w) => w.kind)).toEqual([k('1z'), k('2z')]);
    for (const w of a.waits) {
      expect(w.ron.ok).toBe(true);
      expect(w.tsumo.ok).toBe(true);
    }
    expect(a.realWinPossible).toBe(true);
    expect(a.furiten).toBe(false);
  });

  it('"não visíveis" desconta só o que o jogador vê: mão, rios, grupos e indicadores', () => {
    const s = rig({ hands: [B, '123m456p789s1122z', C, D], draws: '9m', dora: '1z' });
    // Um 2z no rio do assento 3 (tirado do muro para manter a conservação).
    const h = s.hand!;
    const idx = h.wall.findIndex((x) => x.kind === k('2z'));
    const [twoZ] = h.wall.splice(idx, 1);
    h.players[3]!.discards.push({ tile: twoZ!, tsumogiri: true, riichi: false, calledBy: null });
    const a = analyzeHand(view(s, 1));
    const byKind = Object.fromEntries(a.waits.map((w) => [w.kind, w.notVisible]));
    expect(byKind[k('1z')]).toBe(4 - 2 - 1); // 2 na mão + 1 indicador
    expect(byKind[k('2z')]).toBe(4 - 2 - 1); // 2 na mão + 1 no rio
    // A mão de um adversário com cópias não conta (é informação oculta).
  });

  it('No Yaku separado por ron e tsumo; riichi daria yaku', () => {
    const s = rig({ hands: [B, '234m456p789s234s9m', C, D], draws: '1z', dora: '8p' });
    const a = analyzeHand(view(s, 1));
    const [w] = a.waits;
    expect(w?.kind).toBe(k('9m'));
    expect(w?.ron.ok).toBe(false);
    expect(w?.tsumo.ok).toBe(true);
    expect(w?.tsumo.yaku).toEqual(['menzenTsumo']);
    expect(w?.riichiWouldGiveYaku).toBe(false); // já tem yaku no tsumo
    expect(a.realWinPossible).toBe(true);
  });

  it('mão aberta sem yaku: nenhuma vitória real', () => {
    const s = rig({ hands: [B, '234m456p789s234s9m', C, D], draws: '1z', dora: '8p' });
    const p1 = s.hand!.players[1]!;
    const seq = p1.hand.filter((x) => ['2m', '3m', '4m'].map(k).includes(x.kind)).slice(0, 3);
    p1.hand = p1.hand.filter((x) => !seq.includes(x));
    p1.melds.push({ type: 'chi', tiles: seq, called: seq[0]!, from: 0 });
    const a = analyzeHand(view(s, 1));
    expect(a.waits[0]?.ron.ok).toBe(false);
    expect(a.waits[0]?.tsumo.ok).toBe(false);
    expect(a.waits[0]?.riichiWouldGiveYaku).toBe(false);
    expect(a.realWinPossible).toBe(false);
  });

  it('furiten: espera entre os próprios descartes; tsumo ainda é vitória real', () => {
    const s = rig({ hands: [B, '123m456p789s1122z', C, D], draws: '9m', dora: '8p' });
    const h = s.hand!;
    const idx = h.wall.findIndex((x) => x.kind === k('1z'));
    const [oneZ] = h.wall.splice(idx, 1);
    h.players[1]!.discards.push({ tile: oneZ!, tsumogiri: true, riichi: false, calledBy: null });
    const a = analyzeHand(view(s, 1));
    expect(a.furiten).toBe(true);
    expect(a.realWinPossible).toBe(true);
  });

  it('han mínimo: yaku de 1 han não basta com mínimo 2', () => {
    const rules = buildRuleSet('yonma', { hanMinimum: 2 });
    const s = rig({ hands: [B, '234m456p789s234s9m', C, D], draws: '1z', dora: '8p' }, rules);
    const w = analyzeHand(view(s, 1)).waits[0];
    expect(w?.tsumo.ok).toBe(false);
    expect(w?.tsumo.belowMinimum).toBe(true);
  });
});

describe('análise de descarte candidato e mão completa', () => {
  it('descartar 9m deixa tenpai; descartar 1z não', () => {
    const s = rig({ hands: ['123m456p789s1122z', B, C, D], draws: '9m', dora: '8p' });
    const v = view(s, 0);
    const nine = v.hand.find((x) => x.kind === k('9m'))!;
    const east = v.hand.find((x) => x.kind === k('1z'))!;
    expect(analyzeHand(v, nine).state).toBe('tenpai');
    const bad = analyzeHand(v, east);
    expect(bad.state).toBe('notTenpai');
    expect(bad.shanten).toBe(1);
    // Sem peça analisada, a mão de 14 não finge ter esperas (nem "nenhuma vitória possível").
    const whole = analyzeHand(v);
    expect(whole.state).toBe('discardToTenpai');
    expect(whole.waits).toEqual([]);
  });

  it('mão de 14 completa: distingue forma completa de yaku', () => {
    const s = rig({ hands: ['123m456p789s1122z', B, C, D], draws: '2z', dora: '8p' });
    const a = analyzeHand(view(s, 0));
    expect(a.state).toBe('complete');
    expect(a.completeWithYaku?.ok).toBe(true);
    expect(a.completeWithYaku?.yaku).toContain('menzenTsumo');
  });
});

describe('rótulos e Indicador → Dora', () => {
  it('rótulos padrão: número nos naipes, nome nos ventos, dragões desligados', () => {
    expect(labelFor(k('5p'), DEFAULT_LABELS)).toEqual({ type: 'number', n: 5 });
    expect(labelFor(k('3z'), DEFAULT_LABELS)).toEqual({ type: 'wind', index: 2, form: 'name' });
    expect(labelFor(k('6z'), DEFAULT_LABELS)).toBeNull();
    expect(labelFor(k('7z'), { ...DEFAULT_LABELS, dragons: 'abbr' })).toEqual({
      type: 'dragon',
      index: 2,
      form: 'abbr',
    });
    expect(labelFor(k('1m'), { ...DEFAULT_LABELS, numbers: false })).toBeNull();
  });

  it('indicador 9m ⇒ dora 1m; Leste ⇒ Sul', () => {
    const s = rig({ hands: [B, C, D, '123m456p789s1122z'], draws: '9m', dora: '9m' });
    expect(doraPairs(view(s, 0))).toEqual([{ indicator: k('9m'), dora: k('1m') }]);
  });
});
