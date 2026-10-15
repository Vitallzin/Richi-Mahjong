import { degreeToFreq, phrase } from './music';

describe('música ambiente', () => {
  it('a escala é a pentatônica de Ré (D E F# A B), oitava a oitava', () => {
    const d3 = degreeToFreq(0);
    expect(d3).toBeCloseTo(146.83, 1);
    const ratios = [0, 1, 2, 3, 4, 5].map((d) => Math.round(12 * Math.log2(degreeToFreq(d) / d3)));
    expect(ratios).toEqual([0, 2, 4, 7, 9, 12]);
    expect(degreeToFreq(-1)).toBeCloseTo(d3 * 2 ** (-3 / 12), 2); // B abaixo de D
  });

  it('a frase anda por graus vizinhos dentro da tessitura e respeita a densidade', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    let prev = 7;
    let total = 0;
    for (let bar = 0; bar < 200; bar++) {
      const notes = phrase(prev, 0.5, rand);
      for (const n of notes) {
        expect(Math.abs(n.degree - prev)).toBeLessThanOrEqual(2);
        expect(n.degree).toBeGreaterThanOrEqual(3);
        expect(n.degree).toBeLessThanOrEqual(12);
        expect(n.beat).toBeGreaterThanOrEqual(0);
        expect(n.beat).toBeLessThan(4);
        prev = n.degree;
      }
      total += notes.length;
    }
    expect(total / 200).toBeGreaterThan(1.5);
    expect(total / 200).toBeLessThan(5);
    expect(phrase(7, 0, rand)).toEqual([]);
  });
});
