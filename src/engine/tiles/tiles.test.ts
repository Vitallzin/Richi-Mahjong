import {
  buildTileSet,
  doraFromIndicator,
  formatCounts,
  formatTiles,
  isGreen,
  isTerminal,
  isYaochu,
  kindToString,
  NotationError,
  parseCounts,
  parseKinds,
  parseTiles,
  sortTiles,
  tileToString,
  toCounts,
  EAST,
  NORTH,
  WEST,
  HAKU,
  CHUN,
} from './index';

const k = (s: string) => {
  const [kind] = parseKinds(s);
  if (kind === undefined) throw new Error(s);
  return kind;
};

describe('notação', () => {
  it('converte notação em tipos e volta', () => {
    expect(parseKinds('123m')).toEqual([0, 1, 2]);
    expect(parseKinds('19p')).toEqual([9, 17]);
    expect(parseKinds('1s9s')).toEqual([18, 26]);
    expect(parseKinds('1234567z')).toEqual([27, 28, 29, 30, 31, 32, 33]);
    expect(parseKinds('0m0p0s')).toEqual([4, 13, 22]);
    expect(kindToString(13)).toBe('5p');
  });

  it('ignora espaços e rejeita notação inválida', () => {
    expect(parseKinds('12 3m')).toEqual([0, 1, 2]);
    expect(() => parseKinds('8z')).toThrow(NotationError);
    expect(() => parseKinds('0z')).toThrow(NotationError);
    expect(() => parseKinds('m')).toThrow(NotationError);
    expect(() => parseKinds('123')).toThrow(NotationError);
    expect(() => parseKinds('12x')).toThrow(NotationError);
  });

  it('gera peças físicas com ids únicos e vermelho na cópia 0', () => {
    const tiles = parseTiles('0555m');
    expect(tiles.map((t) => t.id)).toEqual([16, 17, 18, 19]);
    expect(tiles.map((t) => t.red)).toEqual([true, false, false, false]);
    expect(() => parseTiles('11111z')).toThrow(NotationError);
    const used = new Set<number>();
    parseTiles('111z', used);
    expect(parseTiles('1z', used)[0]?.id).toBe(EAST * 4);
  });

  it('formata peças e contagens', () => {
    const tiles = parseTiles('123m406p789s11z');
    expect(formatTiles(tiles)).toBe('123m406p789s11z');
    expect(formatCounts(parseCounts('3m12m1z'))).toBe('123m1z');
    expect(formatTiles([])).toBe('');
    expect(tiles.map(tileToString).slice(3, 6)).toEqual(['4p', '0p', '6p']);
  });

  it('ordena com o 5 vermelho antes do normal', () => {
    const sorted = sortTiles(parseTiles('5p1m0p'));
    expect(formatTiles(sorted)).toBe('1m05p');
  });
});

describe('classificação', () => {
  it('terminais, honras e verdes', () => {
    expect(isTerminal(k('1m'))).toBe(true);
    expect(isTerminal(k('9s'))).toBe(true);
    expect(isTerminal(k('5p'))).toBe(false);
    expect(isTerminal(k('1z'))).toBe(false);
    expect(isYaochu(k('7z'))).toBe(true);
    expect(isGreen(k('6z'))).toBe(true);
    expect(isGreen(k('5s'))).toBe(false);
    expect(isGreen(k('8s'))).toBe(true);
  });
});

describe('ordem de dora (spec 7.1 e 7.13)', () => {
  it('números circulam dentro do naipe', () => {
    expect(doraFromIndicator(k('1m'), 'yonma')).toBe(k('2m'));
    expect(doraFromIndicator(k('9m'), 'yonma')).toBe(k('1m'));
    expect(doraFromIndicator(k('9p'), 'yonma')).toBe(k('1p'));
    expect(doraFromIndicator(k('4s'), 'yonma')).toBe(k('5s'));
  });

  it('ventos e dragões circulam entre si', () => {
    expect(doraFromIndicator(EAST, 'yonma')).toBe(k('2z'));
    expect(doraFromIndicator(NORTH, 'yonma')).toBe(EAST);
    expect(doraFromIndicator(WEST, 'sanma')).toBe(NORTH);
    expect(doraFromIndicator(CHUN, 'yonma')).toBe(HAKU);
    expect(doraFromIndicator(HAKU, 'yonma')).toBe(k('6z'));
  });

  it('sanma: 1m e 9m indicam um ao outro', () => {
    expect(doraFromIndicator(k('1m'), 'sanma')).toBe(k('9m'));
    expect(doraFromIndicator(k('9m'), 'sanma')).toBe(k('1m'));
    expect(doraFromIndicator(k('9p'), 'sanma')).toBe(k('1p'));
  });
});

describe('conjunto de peças', () => {
  const reds = (tiles: ReturnType<typeof buildTileSet>) =>
    tiles.filter((t) => t.red).map((t) => kindToString(t.kind));

  it('yonma tem 136 peças e 3 vermelhas por padrão', () => {
    const tiles = buildTileSet('yonma', 3);
    expect(tiles).toHaveLength(136);
    expect(reds(tiles)).toEqual(['5m', '5p', '5s']);
    expect(new Set(tiles.map((t) => t.id)).size).toBe(136);
    expect(toCounts(tiles).every((c) => c === 4)).toBe(true);
  });

  it('yonma com 4 vermelhas tem dois 5p vermelhos; com 0, nenhum', () => {
    expect(reds(buildTileSet('yonma', 4))).toEqual(['5m', '5p', '5p', '5s']);
    expect(reds(buildTileSet('yonma', 0))).toEqual([]);
  });

  it('sanma tem 108 peças, sem 2m–8m, e vermelhos só em 5p e 5s', () => {
    const tiles = buildTileSet('sanma', 2);
    expect(tiles).toHaveLength(108);
    expect(tiles.some((t) => t.kind >= 1 && t.kind <= 7)).toBe(false);
    expect(reds(tiles)).toEqual(['5p', '5s']);
    expect(reds(buildTileSet('sanma', 0))).toEqual([]);
  });
});
