import { createRng, shuffle } from './rng';

describe('PRNG com semente', () => {
  it('é determinístico para a mesma semente', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('sementes diferentes geram sequências diferentes', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('int() é aproximadamente uniforme', () => {
    const rng = createRng(7);
    const buckets = new Array<number>(6).fill(0);
    const n = 60_000;
    for (let i = 0; i < n; i++) {
      const v = rng.int(6);
      buckets[v] = (buckets[v] ?? 0) + 1;
    }
    for (const b of buckets) expect(Math.abs(b - n / 6)).toBeLessThan(n * 0.01);
  });

  it('int() rejeita limites inválidos', () => {
    const rng = createRng(1);
    expect(() => rng.int(0)).toThrow(RangeError);
    expect(() => rng.int(1.5)).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('é uma permutação e não altera a entrada', () => {
    const input = Array.from({ length: 136 }, (_, i) => i);
    const out = shuffle(input, createRng(3));
    expect(out).not.toEqual(input);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(input[0]).toBe(0);
  });

  it('não tem viés de posição', () => {
    const rng = createRng(11);
    const firstCounts = new Array<number>(4).fill(0);
    const n = 40_000;
    for (let i = 0; i < n; i++) {
      const [first] = shuffle([0, 1, 2, 3], rng);
      firstCounts[first as number] = (firstCounts[first as number] ?? 0) + 1;
    }
    for (const c of firstCounts) expect(Math.abs(c - n / 4)).toBeLessThan(n * 0.015);
  });
});
