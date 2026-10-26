import { parseTiles, type DiscardEntry, type Seat } from '../../engine';
import { visibleDiscards } from './pond';

const pond = (marks: readonly { riichi?: boolean; calledBy?: Seat }[]): DiscardEntry[] =>
  parseTiles('1m2m3m4m5m')
    .slice(0, marks.length)
    .map((tile, i) => ({
      tile,
      tsumogiri: false,
      riichi: marks[i]?.riichi ?? false,
      calledBy: marks[i]?.calledBy ?? null,
    }));

describe('visibleDiscards', () => {
  it('tira do rio a peça que alguém chamou', () => {
    const shown = visibleDiscards(pond([{}, { calledBy: 2 }, {}]));
    expect(shown.map((x) => x.entry.tile.kind)).toEqual([0, 2]);
  });

  it('peça de riichi chamada: a próxima que fica no rio aparece deitada', () => {
    const shown = visibleDiscards(pond([{}, { riichi: true, calledBy: 1 }, {}, {}]));
    expect(shown.map((x) => x.sideways)).toEqual([false, true, false]);
  });

  it('peça de riichi não chamada continua deitada', () => {
    const shown = visibleDiscards(pond([{ riichi: true }, {}]));
    expect(shown.map((x) => x.sideways)).toEqual([true, false]);
  });
});
