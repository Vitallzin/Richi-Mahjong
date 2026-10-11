import { PRESET_SANMA, PRESET_YONMA } from '../rules';
import { winInput, type WinOptions } from '../testing/builders';
import { EAST } from '../tiles';
import type { Seat } from '../types';
import {
  basicPoints,
  meetsHanMinimum,
  nagashiPayments,
  notenPayments,
  roundUp100,
  scoreHand,
  winPayments,
} from './index';

const rules = PRESET_YONMA;
const pts = (han: number, fu: number, kiriage = false) =>
  basicPoints(han, fu, 0, { kiriageMangan: kiriage, kazoeYakuman: true });

const ron = (base: number, dealer: boolean) => roundUp100(base * (dealer ? 6 : 4));
const tsumoNonDealer = (base: number) => [roundUp100(base), roundUp100(base * 2)];

describe('tabela de referência (spec 7.10) — deve bater exatamente', () => {
  it.each([
    [1, 30, 1000, 1500],
    [1, 40, 1300, 2000],
    [1, 50, 1600, 2400],
    [1, 60, 2000, 2900],
    [2, 30, 2000, 2900],
    [3, 30, 3900, 5800],
    [4, 30, 7700, 11600],
    [2, 25, 1600, 2400],
  ])('%i han %i fu, ron ⇒ %i / %i', (han, fu, nonDealer, dealer) => {
    const { base } = pts(han, fu);
    expect(ron(base, false)).toBe(nonDealer);
    expect(ron(base, true)).toBe(dealer);
  });

  it('2 han 20 fu tsumo (pinfu tsumo): 400/700 e 700 de todos', () => {
    const { base } = pts(2, 20);
    expect(tsumoNonDealer(base)).toEqual([400, 700]);
    expect(roundUp100(base * 2)).toBe(700);
  });

  it.each([
    ['mangan', 5, 8000, 12000, [2000, 4000], 4000],
    ['haneman', 6, 12000, 18000, [3000, 6000], 6000],
    ['baiman', 8, 16000, 24000, [4000, 8000], 8000],
    ['sanbaiman', 11, 24000, 36000, [6000, 12000], 12000],
  ])('%s', (limit, han, nonDealer, dealer, tsumo, dealerTsumo) => {
    const p = pts(han, 30);
    expect(p.limit).toBe(limit);
    expect(ron(p.base, false)).toBe(nonDealer);
    expect(ron(p.base, true)).toBe(dealer);
    expect(tsumoNonDealer(p.base)).toEqual(tsumo);
    expect(roundUp100(p.base * 2)).toBe(dealerTsumo);
  });

  it('yakuman: 32.000 / 48.000 (tsumo 8.000/16.000 e 16.000 de todos)', () => {
    const p = basicPoints(0, 0, 1, rules);
    expect(ron(p.base, false)).toBe(32000);
    expect(ron(p.base, true)).toBe(48000);
    expect(tsumoNonDealer(p.base)).toEqual([8000, 16000]);
    expect(roundUp100(p.base * 2)).toBe(16000);
  });

  it('limites intermediários e kazoe', () => {
    expect(pts(4, 40).limit).toBe('mangan');
    expect(pts(3, 70).limit).toBe('mangan');
    expect(pts(3, 60).limit).toBe('none');
    expect(pts(7, 30).limit).toBe('haneman');
    expect(pts(10, 30).limit).toBe('baiman');
    expect(pts(12, 30).limit).toBe('sanbaiman');
    expect(pts(13, 30)).toMatchObject({ limit: 'yakuman', kazoe: true, yakumanMultiplier: 1 });
    expect(basicPoints(13, 30, 0, { kiriageMangan: false, kazoeYakuman: false }).limit).toBe(
      'sanbaiman',
    );
  });

  it('kiriage mangan arredonda 4 han/30 fu e 3 han/60 fu', () => {
    expect(pts(4, 30, true).limit).toBe('mangan');
    expect(pts(3, 60, true).limit).toBe('mangan');
    expect(pts(3, 50, true).limit).toBe('none');
  });
});

describe('fu (spec 7.10)', () => {
  const fu = (hand: string, win: string, opts: WinOptions = {}) =>
    scoreHand(winInput(hand, win, opts))?.fu;

  it('pinfu: 30 no ron, 20 no tsumo', () => {
    expect(fu('234m456p22345678s', '5s')).toBe(30);
    const s = scoreHand(winInput('234m456p22345678s', '5s', { winType: 'tsumo' }));
    expect(s?.fu).toBe(20);
    expect(s?.han).toBe(3); // pinfu + tanyao + tsumo
  });

  it('trinca fechada de honra, par de vento do assento e tanki', () => {
    // 20 + 10 (ron fechado) + 8 (ankou de honra) + 2 (par Sul) + 2 (tanki) = 42 ⇒ 50
    expect(fu('123m456p789s111z22z', '2z')).toBe(50);
  });

  it('par de vento duplo vale 4', () => {
    // 20 + 10 + 4 (par Leste duplo) + 2 (tanki) = 36 ⇒ 40, com riichi
    expect(
      fu('123m456p789s234s11z', '1z', { seatWind: EAST, isDealer: true, riichi: 'riichi' }),
    ).toBe(40);
  });

  it('kanchan e penchan valem +2', () => {
    expect(fu('234m456p22456678s', '5s')).toBe(40); // 20 + 10 + 2 = 32 ⇒ 40
  });

  it('mão aberta com 20 fu vira 30', () => {
    expect(fu('456p22345678s', '5s', { melds: ['chi:234m'] })).toBe(30);
  });

  it('quadras: aberta simples 8, fechada de honra 32', () => {
    // 20 + 16 (1m aberta, terminal) + 8 (2p aberta) + 16 (3s fechada) + 2 (tanki) = 62 ⇒ 70
    expect(fu('456s77p', '7p', { melds: ['kan:1111m', 'kan:2222p', 'ankan:3333s'] })).toBe(70);
    expect(fu('123m456p789s22s', '2s', { melds: ['ankan:5555z'], riichi: 'riichi' })).toBe(
      // 20 + 10 + 32 (ankan de dragão) + 2 (tanki) = 64 ⇒ 70
      70,
    );
  });

  it('trinca completada por ron conta como aberta', () => {
    // ron em 5s (shanpon): 20 + 10 + 8 (111m) + 8 (999p) + 2 (555s aberta) + 2 (par Vermelho) = 50
    const s = scoreHand(winInput('111m999p234555s77z', '5s', { riichi: 'riichi' }));
    expect(s?.fu).toBe(50);
  });

  it('chiitoitsu: 25 fu fixos', () => {
    expect(fu('1133m5577p99s1122z', '2z')).toBe(25);
  });

  it('escolhe a leitura de maior pontuação', () => {
    // 111222333m: três trincas ou três sequências 123m.
    // Ron: trincas dão só riichi (1 han 50 fu); sequências dão iipeikou + riichi (2 han 40 fu).
    const hand = '111222333m456p55z';
    const ronScore = scoreHand(winInput(hand, '3m', { riichi: 'riichi' }));
    expect(ronScore?.yaku.map((y) => y.id)).toEqual(['riichi', 'iipeikou']);
    // Tsumo: trincas fechadas dão sanankou (4 han 40 fu = mangan).
    const tsumoScore = scoreHand(winInput(hand, '3m', { riichi: 'riichi', winType: 'tsumo' }));
    expect(tsumoScore?.yaku.map((y) => y.id)).toContain('sanankou');
    expect(tsumoScore?.limit).toBe('mangan');
  });
});

describe('han mínimo', () => {
  it('yakuman sempre atinge; dora conta para o mínimo', () => {
    const one = scoreHand(winInput('12399m456p234789s', '9m', { riichi: 'riichi' }));
    const withDora = scoreHand(
      winInput('12399m456p234789s', '9m', { riichi: 'riichi', doraIndicators: [8] }),
    );
    const yakuman = scoreHand(winInput('99p123m555666777z', '9p'));
    if (!one || !withDora || !yakuman) throw new Error('mãos de teste inválidas');
    expect(meetsHanMinimum(one, 2)).toBe(false);
    expect(meetsHanMinimum(withDora, 2)).toBe(true);
    expect(meetsHanMinimum(yakuman, 4)).toBe(true);
  });
});

describe('pagamentos', () => {
  const pay = (over: Partial<Parameters<typeof winPayments>[0]>) =>
    winPayments({
      base: 2000,
      winner: 1,
      dealer: 0,
      winType: 'ron',
      discarder: 2,
      honba: 0,
      riichiSticks: 0,
      rules,
      ...over,
    });

  it('ron de mangan não-dealer com honba e bastões', () => {
    expect(pay({ honba: 2, riichiSticks: 1 })).toEqual([0, 8000 + 600 + 1000, -8600, 0]);
  });

  it('ron do dealer', () => {
    expect(pay({ winner: 0 })).toEqual([12000, 0, -12000, 0]);
  });

  it('tsumo não-dealer e dealer, com honba (100 de cada)', () => {
    expect(pay({ winType: 'tsumo', discarder: undefined, honba: 1 })).toEqual([
      -4100,
      2100 + 4100 + 2100,
      -2100,
      -2100,
    ]);
    expect(pay({ winType: 'tsumo', winner: 0 })).toEqual([12000, -4000, -4000, -4000]);
  });

  it('ron sem descartador é erro', () => {
    expect(() => pay({ discarder: undefined })).toThrow();
  });

  it('sanma tsumo-loss: só 2 pagadores, sem compensação', () => {
    const r = winPayments({
      base: 2000,
      winner: 1,
      dealer: 0,
      winType: 'tsumo',
      honba: 0,
      riichiSticks: 0,
      rules: PRESET_SANMA,
    });
    expect(r).toEqual([-4000, 6000, -2000]);
  });

  it('sanma north-bisection: a parte do ausente é dividida entre os 2 pagadores', () => {
    const r = winPayments({
      base: 2000,
      winner: 1,
      dealer: 0,
      winType: 'tsumo',
      honba: 0,
      riichiSticks: 0,
      rules: { ...PRESET_SANMA, tsumoLoss: false },
    });
    expect(r).toEqual([-5000, 8000, -3000]);
    // 1 han 30 fu (base 240): ausente pagaria 300 ⇒ 150 ⇒ arredonda para 200 cada
    const small = winPayments({
      base: 240,
      winner: 1,
      dealer: 0,
      winType: 'tsumo',
      honba: 0,
      riichiSticks: 0,
      rules: { ...PRESET_SANMA, tsumoLoss: false },
    });
    expect(small).toEqual([-700, 1200, -500]);
    const dealerWin = winPayments({
      base: 2000,
      winner: 0,
      dealer: 0,
      winType: 'tsumo',
      honba: 0,
      riichiSticks: 0,
      rules: { ...PRESET_SANMA, tsumoLoss: false },
    });
    expect(dealerWin).toEqual([12000, -6000, -6000]);
  });

  it('pao no tsumo: o responsável paga tudo, inclusive honba', () => {
    const r = pay({
      base: 8000,
      winType: 'tsumo',
      discarder: undefined,
      honba: 1,
      pao: { seat: 3 as Seat, base: 8000 },
    });
    expect(r).toEqual([0, 32000 + 300, 0, -32300]);
  });

  it('pao no ron: responsável e descartador dividem; honba com o descartador', () => {
    const r = pay({ base: 8000, honba: 1, pao: { seat: 3 as Seat, base: 8000 } });
    expect(r).toEqual([0, 32300, -16300, -16000]);
  });

  it('pao só sobre a parte do yakuman responsável', () => {
    // daisangen (pao) + tsuuiisou: 2 yakuman, só um sob pao
    const r = pay({ base: 16000, pao: { seat: 3 as Seat, base: 8000 } });
    expect(r).toEqual([0, 64000, -48000, -16000]);
  });

  it('noten: 1, 2 e 3 tenpai (yonma) e sanma', () => {
    expect(notenPayments([true, false, false, false], rules)).toEqual([3000, -1000, -1000, -1000]);
    expect(notenPayments([true, true, false, false], rules)).toEqual([1500, 1500, -1500, -1500]);
    expect(notenPayments([true, true, true, false], rules)).toEqual([1000, 1000, 1000, -3000]);
    expect(notenPayments([false, false, false, false], rules)).toEqual([0, 0, 0, 0]);
    expect(notenPayments([true, true, true, true], rules)).toEqual([0, 0, 0, 0]);
    expect(notenPayments([true, false, false], PRESET_SANMA)).toEqual([3000, -1500, -1500]);
    expect(notenPayments([true, true, false], PRESET_SANMA)).toEqual([1500, 1500, -3000]);
  });

  it('nagashi mangan paga como tsumo de mangan', () => {
    expect(nagashiPayments(2, 0, rules)).toEqual([-4000, -2000, 8000, -2000]);
    expect(nagashiPayments(0, 0, rules)).toEqual([12000, -4000, -4000, -4000]);
  });
});
