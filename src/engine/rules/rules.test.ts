import {
  buildRuleSet,
  InvalidRulesError,
  PRESET_SANMA,
  PRESET_YONMA,
  RULE_OPTIONS,
  ruleOption,
  validateRules,
} from './index';

const codes = (mode: 'yonma' | 'sanma', selection: Record<string, unknown>) =>
  validateRules(mode, selection).issues.map((i) => `${i.optionId}:${i.code}:${i.severity}`);

describe('presets (spec 6.2)', () => {
  it('yonma: 25.000/30.000, 3 vermelhas, kuitan, tobi, agari-yame', () => {
    expect(PRESET_YONMA).toMatchObject({
      mode: 'yonma',
      players: 4,
      startingPoints: 25_000,
      targetPoints: 30_000,
      akaDora: 3,
      kuitan: true,
      tobi: true,
      agariYame: true,
      hanMinimum: 1,
      kiriageMangan: false,
      length: 'south',
      honbaRon: 300,
      notenTotal: 3000,
      chi: true,
    });
  });

  it('sanma: 35.000/40.000, 2 vermelhas, tsumo-loss, nuki-dora, sem chi', () => {
    expect(PRESET_SANMA).toMatchObject({
      mode: 'sanma',
      players: 3,
      startingPoints: 35_000,
      targetPoints: 40_000,
      akaDora: 2,
      tsumoLoss: true,
      nukiDora: true,
      chi: false,
      handsPerWind: 3,
    });
    expect(PRESET_SANMA.abortive).toEqual({
      kyuushuKyuuhai: true,
      suufonRenda: false,
      suukaikan: true,
      suuchaRiichi: false,
    });
  });

  it('presets são congelados', () => {
    expect(Object.isFrozen(PRESET_YONMA)).toBe(true);
    expect(Object.isFrozen(PRESET_SANMA.abortive)).toBe(true);
  });
});

describe('validateRules (spec 6.4)', () => {
  it('aceita a seleção vazia e os padrões', () => {
    expect(validateRules('yonma', {})).toEqual({ valid: true, issues: [] });
    expect(validateRules('sanma', { akaDora: 2, tsumoLoss: false }).valid).toBe(true);
  });

  it('rejeita opção inexistente na modalidade', () => {
    expect(codes('yonma', { nukiDora: true })).toEqual(['nukiDora:notInMode:error']);
    expect(codes('yonma', { tsumoLoss: true })).toEqual(['tsumoLoss:notInMode:error']);
    expect(codes('yonma', { foo: 1 })).toEqual(['foo:unknownOption:error']);
  });

  it('rejeita valores fora da lista da modalidade', () => {
    expect(codes('sanma', { akaDora: 3 })).toEqual(['akaDora:invalidValue:error']);
    expect(codes('yonma', { akaDora: 2 })).toEqual(['akaDora:invalidValue:error']);
    expect(codes('yonma', { hanMinimum: 3 })).toEqual(['hanMinimum:invalidValue:error']);
    expect(codes('yonma', { kuitan: 'sim' })).toEqual(['kuitan:invalidValue:error']);
    expect(codes('yonma', { length: 'west' })).toEqual(['length:invalidValue:error']);
  });

  it('valida faixa e passo dos pontos (100 a 200.000, múltiplos de 100)', () => {
    expect(codes('yonma', { startingPoints: 50 })).toEqual(['startingPoints:outOfRange:error']);
    expect(codes('yonma', { startingPoints: 200_100 })).toEqual([
      'startingPoints:outOfRange:error',
    ]);
    expect(codes('yonma', { targetPoints: 30_050 })).toEqual([
      'targetPoints:notMultipleOfStep:error',
    ]);
    expect(codes('yonma', { startingPoints: '25000' })).toEqual([
      'startingPoints:invalidValue:error',
    ]);
    expect(codes('yonma', { startingPoints: Number.NaN })).toEqual([
      'startingPoints:invalidValue:error',
    ]);
  });

  it('respeita opções travadas', () => {
    expect(codes('sanma', { nukiDora: false })).toEqual(['nukiDora:locked:error']);
    expect(codes('sanma', { nukiDora: true })).toEqual([]);
  });

  it('avisa (sem bloquear) alvo ≤ pontos iniciais e pontos baixos com tobi', () => {
    const result = validateRules('yonma', { targetPoints: 25_000 });
    expect(result.valid).toBe(true);
    expect(codes('yonma', { targetPoints: 25_000 })).toEqual([
      'targetPoints:targetNotAboveStart:warning',
    ]);
    expect(codes('yonma', { startingPoints: 5_000, targetPoints: 30_000 })).toEqual([
      'startingPoints:lowStartWithTobi:warning',
    ]);
    expect(codes('yonma', { startingPoints: 5_000, tobi: false })).toEqual([]);
  });

  it('cada issue traz chave i18n', () => {
    const [first] = validateRules('sanma', { akaDora: 3 }).issues;
    expect(first?.messageKey).toBe('rules.issue.invalidValue');
  });
});

describe('buildRuleSet', () => {
  it('aplica a seleção e congela', () => {
    const rules = buildRuleSet('yonma', { kuitan: false, akaDora: 0, length: 'east' });
    expect(rules).toMatchObject({ kuitan: false, akaDora: 0, length: 'east', players: 4 });
    expect(Object.isFrozen(rules)).toBe(true);
  });

  it('com avançadas desligadas, só vale o bloco básico', () => {
    const rules = buildRuleSet('yonma', { kuitan: false, length: 'oneHand' }, false);
    expect(rules.kuitan).toBe(true);
    expect(rules.length).toBe('oneHand');
  });

  it('lança erro com seleção inválida', () => {
    expect(() => buildRuleSet('sanma', { akaDora: 4 })).toThrow(InvalidRulesError);
  });
});

describe('RULE_OPTIONS', () => {
  it('cada opção tem padrão por modalidade e chaves i18n', () => {
    for (const option of RULE_OPTIONS) {
      for (const mode of option.modes) expect(option.default[mode]).toBeDefined();
      expect(option.label).toMatch(/^rules\./);
      expect(option.description).toMatch(/^rules\./);
    }
    expect(ruleOption('nukiDora')?.locked?.sanma).toBe(true);
    expect(ruleOption('length')?.group).toBe('basic');
  });
});
