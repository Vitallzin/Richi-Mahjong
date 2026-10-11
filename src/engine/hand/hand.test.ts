import { createRng, shuffle } from '../rng';
import {
  KIND_COUNT,
  formatCounts,
  parseCounts,
  parseKinds,
  toCounts,
  buildTileSet,
} from '../tiles';
import {
  chiitoitsuShanten,
  decompositions,
  isAgari,
  isTenpai,
  kokushiShanten,
  regularDecompositions,
  regularShanten,
  shanten,
  waits,
} from './index';

const sh = (hand: string, melds = 0) => shanten(parseCounts(hand), melds);
const w = (hand: string, melds = 0) =>
  formatCounts(toCountsOfKinds(waits(parseCounts(hand), melds)));
const toCountsOfKinds = (kinds: number[]) => toCounts(kinds.map((kind) => ({ kind })));

describe('shanten — casos conhecidos', () => {
  it.each([
    ['123m456p789s11222z', -1],
    ['123m456p789s1122z', 0],
    ['123m456p789s1123z', 1],
    ['1122m3344p5566s7z', 0],
    ['1122m3344p5566s77z', -1],
    ['19m19p19s1234567z', 0],
    ['19m19p19s12345677z', -1],
    ['1112345678999m', 0],
    ['147m258p369s1234z', 6], // chiitoitsu: 13 tipos sem pares
    ['13579m13579p135s', 4],
    ['11m', -1], // só o par, com 4 grupos chamados
  ])('%s ⇒ %i', (hand, expected) => {
    const melds = hand === '11m' ? 4 : 0;
    expect(sh(hand, melds)).toBe(expected);
  });

  it('chamadas reduzem os grupos necessários', () => {
    expect(sh('123m45p67s', 2)).toBe(1); // 1 grupo + 2 protogrupos, sem par
    expect(sh('123m4p', 3)).toBe(0); // tanki
    expect(sh('1m', 4)).toBe(0);
  });

  it('formas especiais isoladas', () => {
    expect(chiitoitsuShanten(parseCounts('1122m3344p5566s7z'))).toBe(0);
    expect(chiitoitsuShanten(parseCounts('1111m2233p4455s6z'))).toBe(2); // quadra não vale 2 pares
    expect(kokushiShanten(parseCounts('19m19p19s1234567z'))).toBe(0);
    expect(kokushiShanten(parseCounts('19m19p19s1234566z'))).toBe(0);
    expect(kokushiShanten(parseCounts('22m19p19s1234566z'))).toBe(2); // faltam 1m e 9m
  });
});

describe('esperas', () => {
  it('shanpon, ryanmen, kanchan, penchan e tanki', () => {
    expect(w('123m456p789s1122z')).toBe('12z');
    expect(w('23m456p789s11122z')).toBe('14m');
    expect(w('13m456p789s11122z')).toBe('2m');
    expect(w('12m456p789s11122z')).toBe('3m');
    expect(w('123m456p789s1112z')).toBe('2z');
  });

  it('chuuren poutou espera os 9 tipos', () => {
    expect(w('1112345678999m')).toBe('123456789m');
  });

  it('kokushi de 13 esperas', () => {
    expect(w('19m19p19s1234567z')).toBe('19m19p19s1234567z');
  });

  it('nobetan e esperas múltiplas', () => {
    expect(w('1234m', 3)).toBe('14m');
    expect(w('2345678m', 2)).toBe('258m');
  });

  it('não espera tipo do qual já tem as 4 cópias (tenpai só de forma)', () => {
    const counts = parseCounts('1111m234p567s789s');
    expect(shanten(counts)).toBe(0);
    expect(waits(counts)).toEqual([]);
    expect(isTenpai(counts)).toBe(false);
    expect(parseKinds('1m')).toEqual([0]);
  });

  it('isTenpai coerente com as esperas', () => {
    expect(isTenpai(parseCounts('123m456p789s1122z'))).toBe(true);
    expect(isTenpai(parseCounts('123m456p789s1123z'))).toBe(false);
  });
});

describe('decomposição', () => {
  it('encontra todas as leituras (trincas × sequências)', () => {
    const decs = regularDecompositions(parseCounts('111222333m456p77z'));
    expect(decs).toHaveLength(2);
    const types = decs.map((d) => d.sets.map((s) => s.type).join(','));
    expect(types).toContain('trip,trip,trip,seq');
    expect(types).toContain('seq,seq,seq,seq');
  });

  it('ryanpeikou também é lido como chiitoitsu', () => {
    const forms = decompositions(parseCounts('112233m445566p77z')).map((d) => d.form);
    expect(forms).toContain('regular');
    expect(forms).toContain('chiitoitsu');
  });

  it('kokushi e chiitoitsu não existem com chamadas', () => {
    expect(decompositions(parseCounts('19m19p19s12345677z'), 0).map((d) => d.form)).toEqual([
      'kokushi',
    ]);
    expect(decompositions(parseCounts('1122m3344p55s'), 1)).toEqual([]);
  });

  it('rejeita totais impossíveis', () => {
    expect(regularDecompositions(parseCounts('123m'))).toEqual([]);
    expect(isAgari(parseCounts('123m456p789s11222z'))).toBe(true);
  });
});

describe('shanten — propriedade (definição recursiva)', () => {
  // s(h) = 0 se tenpai; caso contrário, s(h) = 1 + min sobre (compra k, descarte d) de s(h + k − d).
  const allKinds = Array.from({ length: KIND_COUNT }, (_, k) => k);

  const bestAfterExchange = (counts: number[]): number => {
    let best = Infinity;
    for (const k of allKinds) {
      if ((counts[k] as number) >= 4) continue;
      counts[k] = (counts[k] as number) + 1;
      for (const d of allKinds) {
        if (d === k || (counts[d] as number) === 0) continue;
        counts[d] = (counts[d] as number) - 1;
        best = Math.min(best, shanten(counts));
        counts[d] = (counts[d] as number) + 1;
      }
      counts[k] = (counts[k] as number) - 1;
    }
    return best;
  };

  it('vale para mãos aleatórias de 13 peças', () => {
    const rng = createRng(2024);
    const wall = buildTileSet('yonma', 0);
    for (let i = 0; i < 60; i++) {
      const counts = toCounts(shuffle(wall, rng).slice(0, 13));
      const s = shanten(counts);
      if (s === 0) {
        expect(waits(counts).length).toBeGreaterThanOrEqual(0);
        continue;
      }
      expect(bestAfterExchange(counts)).toBe(s - 1);
    }
  });

  it('mão de 14 peças completa ⇔ alguma decomposição', () => {
    const rng = createRng(77);
    const wall = buildTileSet('yonma', 0);
    for (let i = 0; i < 300; i++) {
      const counts = toCounts(shuffle(wall, rng).slice(0, 14));
      expect(shanten(counts) === -1).toBe(decompositions(counts).length > 0);
      expect(regularShanten(counts) >= -1).toBe(true);
    }
  });
});
