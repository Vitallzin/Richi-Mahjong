import { PRESET_SANMA, PRESET_YONMA } from '../rules';
import { scoreHand, type ScoredHand } from '../scoring';
import { winInput, type WinOptions } from '../testing/builders';
import { EAST, NORTH, SOUTH, WEST } from '../tiles';

const score = (hand: string, win: string, opts: WinOptions = {}): ScoredHand | null =>
  scoreHand(winInput(hand, win, opts));

/** Ids dos yaku (normais ou yakuman) da melhor leitura, ou null se não houver yaku. */
const ids = (hand: string, win: string, opts: WinOptions = {}): string[] | null => {
  const s = score(hand, win, opts);
  if (!s) return null;
  return [...s.yaku, ...s.yakuman].map((y) => y.id).sort();
};

const value = (hand: string, win: string, id: string, opts: WinOptions = {}): number => {
  const s = score(hand, win, opts);
  return [...(s?.yaku ?? []), ...(s?.yakuman ?? [])].find((y) => y.id === id)?.value ?? 0;
};

// Mão fechada sem yaku próprio: 123m 99m 456p 234s 789s, tanki em 9m.
const PLAIN = '12399m456p234789s';

describe('yaku de situação', () => {
  it('sem yaku: ron com mão fechada sem riichi não vence', () => {
    expect(ids(PLAIN, '9m')).toBeNull();
  });

  it('riichi', () => {
    expect(ids(PLAIN, '9m', { riichi: 'riichi' })).toEqual(['riichi']);
  });

  it('daburu riichi substitui o riichi', () => {
    expect(ids(PLAIN, '9m', { riichi: 'double' })).toEqual(['doubleRiichi']);
    expect(value(PLAIN, '9m', 'doubleRiichi', { riichi: 'double' })).toBe(2);
  });

  it('ippatsu só com riichi', () => {
    expect(ids(PLAIN, '9m', { riichi: 'riichi', ippatsu: true })).toEqual(['ippatsu', 'riichi']);
    expect(ids(PLAIN, '9m', { ippatsu: true })).toBeNull();
  });

  it('menzen tsumo só fechado', () => {
    expect(ids(PLAIN, '9m', { winType: 'tsumo' })).toEqual(['menzenTsumo']);
    expect(ids('99m456p234789s', '9m', { winType: 'tsumo', melds: ['chi:123m'] })).toBeNull();
  });

  it('haitei (tsumo) e houtei (ron)', () => {
    expect(ids(PLAIN, '9m', { winType: 'tsumo', haitei: true })).toEqual(['haitei', 'menzenTsumo']);
    expect(ids(PLAIN, '9m', { houtei: true })).toEqual(['houtei']);
    expect(ids(PLAIN, '9m', { haitei: true })).toBeNull(); // haitei não vale no ron
    expect(ids(PLAIN, '9m', { winType: 'tsumo', haitei: true, rinshan: true })).toEqual([
      'menzenTsumo',
      'rinshan',
    ]);
  });

  it('rinshan (tsumo) e chankan (ron)', () => {
    expect(ids(PLAIN, '9m', { winType: 'tsumo', rinshan: true })).toEqual([
      'menzenTsumo',
      'rinshan',
    ]);
    expect(ids(PLAIN, '9m', { chankan: true })).toEqual(['chankan']);
  });

  it('tenhou e chiihou são yakuman e excluem os yaku normais', () => {
    expect(ids(PLAIN, '9m', { winType: 'tsumo', tenhou: true, isDealer: true })).toEqual([
      'tenhou',
    ]);
    expect(ids(PLAIN, '9m', { winType: 'tsumo', chiihou: true })).toEqual(['chiihou']);
  });
});

describe('yaku de 1 han', () => {
  it('tanyao fechado, aberto com kuitan, e não aberto sem kuitan', () => {
    expect(ids('234m456p22345678s', '5s')).toEqual(['pinfu', 'tanyao']);
    expect(ids('456p22345678s', '5s', { melds: ['chi:234m'] })).toEqual(['tanyao']);
    const noKuitan = { ...PRESET_YONMA, kuitan: false };
    expect(ids('456p22345678s', '5s', { melds: ['chi:234m'], rules: noKuitan })).toBeNull();
  });

  it('pinfu exige espera ryanmen, 4 sequências e par sem valor', () => {
    expect(ids('234m456p22456678s', '5s')).toEqual(['tanyao']); // kanchan
    expect(ids('112233m456p55678s', '6s')).toEqual(['iipeikou', 'pinfu']);
    // Par de vento do assento tira o pinfu.
    expect(ids('123m456p678s22z345s', '5s', { riichi: 'riichi' })).toEqual(['riichi']);
    // Par de vento sem valor (Oeste) mantém o pinfu.
    expect(ids('123m456p678s33z345s', '5s', { riichi: 'riichi' })).toEqual(['pinfu', 'riichi']);
    // Penchan: 12 esperando 3.
    expect(ids('123789m456p789s33z', '3m', { riichi: 'riichi' })).toEqual(['riichi']);
  });

  it('iipeikou só fechado', () => {
    expect(ids('112233m456p55678s', '6s', { melds: [] })).toContain('iipeikou');
    expect(ids('456p55678s', '6s', { melds: ['chi:123m', 'chi:123m'] })).toBeNull();
  });

  it('yakuhai: dragões, vento do assento, vento da rodada e vento duplo', () => {
    expect(ids('123m456p789s22s555z', '2s')).toEqual(['yakuhaiHaku']);
    expect(ids('123m456p789s22s666z', '2s')).toEqual(['yakuhaiHatsu']);
    expect(ids('123m456p789s22s777z', '2s')).toEqual(['yakuhaiChun']);
    expect(ids('123m456p789s22s222z', '2s')).toEqual(['yakuhaiSeatWind']);
    expect(ids('123m456p789s22s111z', '2s')).toEqual(['yakuhaiRoundWind']);
    expect(ids('123m456p789s22s111z', '2s', { seatWind: EAST, isDealer: true })).toEqual([
      'yakuhaiRoundWind',
      'yakuhaiSeatWind',
    ]);
    expect(ids('123m456p789s22s333z', '2s')).toBeNull();
  });

  it('yakuhai em quadra também vale', () => {
    expect(ids('123m456p789s22s', '2s', { melds: ['kan:7777z'] })).toEqual(['yakuhaiChun']);
  });
});

describe('yaku de 2 ou mais han', () => {
  it('chiitoitsu (25 fu)', () => {
    const s = score('1133m5577p99s1122z', '2z');
    expect(s?.yaku.map((y) => y.id)).toEqual(['chiitoitsu']);
    expect(s?.fu).toBe(25);
  });

  it('chiitoitsu não aceita quadra como dois pares', () => {
    expect(score('1111m5577p99s1122z', '2z')).toBeNull();
  });

  it('sanshoku doujun: 2 fechado, 1 aberto', () => {
    expect(ids('234678m23455p234s', '6m')).toEqual(['pinfu', 'sanshokuDoujun', 'tanyao']);
    expect(value('234678m23455p', '6m', 'sanshokuDoujun', { melds: ['chi:234s'] })).toBe(1);
    expect(ids('234678m23455p345s', '6m', { riichi: 'riichi' })).not.toContain('sanshokuDoujun');
  });

  it('ittsu: 2 fechado, 1 aberto', () => {
    expect(ids('123456789m234p55s', '5s')).toEqual(['ittsu']);
    expect(value('456789m234p55s', '5s', 'ittsu', { melds: ['chi:123m'] })).toBe(1);
  });

  it('chanta e junchan', () => {
    expect(ids('12399m789p789s111z', '9m')).toEqual(['chanta', 'yakuhaiRoundWind']);
    expect(ids('12399m789p123789s', '9m')).toEqual(['junchan']);
    expect(value('99m789p123789s', '9m', 'junchan', { melds: ['chi:123m'] })).toBe(2);
    expect(value('99m789p789s111z', '9m', 'chanta', { melds: ['chi:123m'] })).toBe(1);
    // Sem sequência, não é chanta (seria honroutou/toitoi).
    expect(ids('99m999p111s', '9m', { melds: ['pon:111z', 'pon:999s'] })).not.toContain('chanta');
  });

  it('toitoi', () => {
    expect(ids('555s22333z', '2z', { melds: ['pon:111m', 'pon:999p'] })).toEqual(['toitoi']);
  });

  it('sanankou e a trinca completada por ron', () => {
    expect(ids('111m999p234555s77z', '7z')).toEqual(['sanankou']);
    // Shanpon por ron: a trinca completada vira aberta.
    expect(ids('111m999p234555s77z', '5s')).toBeNull();
    expect(ids('111m999p234555s77z', '5s', { winType: 'tsumo' })).toEqual([
      'menzenTsumo',
      'sanankou',
    ]);
  });

  it('sanshoku doukou', () => {
    expect(ids('222456m222p22299s', '9s')).toEqual(['sanankou', 'sanshokuDoukou']);
  });

  it('sankantsu', () => {
    expect(ids('456s77p', '7p', { melds: ['kan:1111m', 'kan:2222p', 'ankan:3333s'] })).toEqual([
      'sankantsu',
    ]);
  });

  it('shousangen', () => {
    expect(ids('123m456p55566677z', '7z')).toEqual(['shousangen', 'yakuhaiHaku', 'yakuhaiHatsu']);
  });

  it('honroutou com toitoi e com chiitoitsu', () => {
    expect(ids('999p111999s22z', '2z', { melds: ['pon:111m'] })).toEqual([
      'honroutou',
      'sanankou',
      'toitoi',
    ]);
    expect(ids('1199m1199p11s1122z', '2z')).toEqual(['chiitoitsu', 'honroutou']);
  });

  it('honitsu: 3 fechado, 2 aberto', () => {
    expect(ids('123456999m22555z', '2z')).toEqual(['honitsu', 'yakuhaiHaku']);
    expect(value('123456999m22z', '2z', 'honitsu', { melds: ['pon:555z'] })).toBe(2);
  });

  it('chinitsu: 6 fechado, 5 aberto, sem honitsu junto', () => {
    const closed = ids('12233445556789m', '5m');
    expect(closed).toContain('chinitsu');
    expect(closed).not.toContain('honitsu');
    expect(value('12233445556789m', '5m', 'chinitsu')).toBe(6);
    expect(value('23445556789m', '5m', 'chinitsu', { melds: ['chi:123m'] })).toBe(5);
  });

  it('ryanpeikou substitui iipeikou e vence a leitura de chiitoitsu', () => {
    const s = score('112233m445566p77s', '7s');
    expect(s?.yaku.map((y) => y.id)).toEqual(['ryanpeikou']);
    expect(s?.yakuHan).toBe(3);
  });
});

describe('yakuman', () => {
  it('kokushi simples e de 13 esperas (duplo)', () => {
    expect(value('119m19p19s1234567z', '7z', 'kokushi')).toBe(1);
    expect(value('19m19p19s12345677z', '7z', 'kokushi')).toBe(2);
  });

  it('suuankou por tsumo (simples) e tanki (duplo); ron em shanpon não é', () => {
    expect(value('111m999p555s22777z', '7z', 'suuankou', { winType: 'tsumo' })).toBe(1);
    expect(value('111m999p555s22777z', '2z', 'suuankou')).toBe(2);
    expect(value('111m999p555s22777z', '7z', 'suuankou')).toBe(0);
  });

  it('daisangen, shousuushii e daisuushii (duplo)', () => {
    expect(ids('99p123m555666777z', '9p')).toEqual(['daisangen']);
    expect(ids('123m11122233344z', '4z')).toEqual(['shousuushii']);
    expect(value('222333444z55m', '5m', 'daisuushii', { melds: ['pon:111z'] })).toBe(2);
  });

  it('tsuuiisou (inclusive em chiitoitsu)', () => {
    expect(ids('222333z555z77z', '7z', { melds: ['pon:111z'] })).toEqual(['tsuuiisou']);
    expect(ids('11223344556677z', '7z')).toEqual(['tsuuiisou']);
  });

  it('chinroutou', () => {
    expect(ids('999m111999p11s', '1s', { melds: ['pon:111m'] })).toEqual(['chinroutou']);
  });

  it('ryuuiisou', () => {
    expect(ids('223344666888s66z', '6z')).toEqual(['ryuuiisou']);
    expect(ids('223344666888s77z', '7z')).not.toEqual(['ryuuiisou']);
  });

  it('chuuren poutou: 9 esperas é duplo', () => {
    expect(value('11123455678999m', '5m', 'chuuren')).toBe(2);
    expect(value('11112345678999m', '1m', 'chuuren')).toBe(2);
    expect(value('11123456789999m', '5m', 'chuuren')).toBe(1);
    expect(
      value('11123456789999m', '5m', 'chuuren', {
        rules: { ...PRESET_YONMA, doubleYakuman: false },
      }),
    ).toBe(1);
  });

  it('suukantsu', () => {
    expect(
      ids('55z', '5z', { melds: ['kan:1111m', 'kan:2222p', 'ankan:3333s', 'kakan:4444z'] }),
    ).toEqual(['suukantsu']);
  });

  it('yakuman acumulados somam multiplicadores', () => {
    const big = score('111222333444z55z', '5z', { winType: 'tsumo' });
    expect(big?.yakumanMultiplier).toBe(2 + 2 + 1); // daisuushii 2 + suuankou tanki 2 + tsuuiisou 1
  });
});

describe('dora, aka, ura e kita', () => {
  it('dora conta só com yaku; ura só com riichi', () => {
    const s = score(PLAIN, '9m', { riichi: 'riichi', doraIndicators: [8], uraIndicators: [7] });
    // indicador 9m ⇒ dora 1m (1 cópia); ura: indicador 8m ⇒ 9m (2 cópias)
    expect(s?.dora).toBe(1);
    expect(s?.ura).toBe(2);
    expect(s?.han).toBe(1 + 1 + 2);
    expect(score(PLAIN, '9m', { doraIndicators: [8] })).toBeNull();
    expect(score(PLAIN, '9m', { winType: 'tsumo', uraIndicators: [7] })?.ura).toBe(0);
  });

  it('peças vermelhas valem +1 cada', () => {
    const s = score('123m406p234789s99m', '9m', { riichi: 'riichi' });
    expect(s?.aka).toBe(1);
    expect(s?.han).toBe(2);
  });

  it('kita vale +1; com Norte dora vale 2 (sanma)', () => {
    const rules = PRESET_SANMA;
    const base = { riichi: 'riichi' as const, rules, kitaCount: 2 };
    expect(score('11199m456p234789s', '9m', base)?.kita).toBe(2);
    const s = score('11199m456p234789s', '9m', { ...base, doraIndicators: [WEST] });
    expect(s?.dora).toBe(2); // Norte é dora: cada kita conta mais 1
    expect(s?.han).toBe(1 + 2 + 2);
    expect(score('11199m456p234789s', '9m', { ...base, uraIndicators: [WEST] })?.ura).toBe(2);
  });

  it('Norte nunca é yakuhai no sanma', () => {
    expect(
      ids('123p456p789s22s444z', '2s', { rules: PRESET_SANMA, seatWind: SOUTH, roundWind: EAST }),
    ).toBeNull();
    expect(NORTH).toBe(30);
  });
});
