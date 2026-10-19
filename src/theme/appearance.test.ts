import {
  appearanceVars,
  BACKGROUNDS,
  BACKS,
  DEFAULT_APPEARANCE,
  FACES,
  FELTS,
  type Appearance,
} from './appearance';

describe('aparência (spec 11.2)', () => {
  it('cada eixo define sempre o mesmo conjunto de variáveis (trocar uma opção não deixa sobras)', () => {
    for (const list of [BACKGROUNDS, FELTS, FACES, BACKS]) {
      const keys = Object.keys(list[0]!.vars).sort();
      for (const o of list) expect(Object.keys(o.vars).sort()).toEqual(keys);
      expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
    }
  });

  it('o padrão é o tema "Noite de Sakura" atual', () => {
    const vars = appearanceVars(DEFAULT_APPEARANCE);
    expect(vars['--color-felt']).toBe('#241a3a');
    expect(vars['--color-tile-back']).toBe('#4a3488');
    expect(vars['--face-a']).toBe('#fffdf6');
  });

  it('eixos independentes; opção desconhecida (preferência antiga) cai na padrão', () => {
    const mixed = appearanceVars({ ...DEFAULT_APPEARANCE, felt: 'jade', back: 'gold' });
    expect(mixed['--color-felt']).toBe('#123631');
    expect(mixed['--color-tile-back']).toBe('#9a7224');
    expect(mixed['--face-a']).toBe('#fffdf6');
    const unknown = { ...DEFAULT_APPEARANCE, faces: 'xyz' } as unknown as Appearance;
    expect(appearanceVars(unknown)['--face-a']).toBe('#fffdf6');
  });
});
