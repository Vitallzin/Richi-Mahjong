/**
 * Opções personalizáveis como dados (spec 6.3). A tela de configuração gera os controles a partir
 * desta lista; adicionar uma regra nova = adicionar um item aqui. `label`/`description` são chaves i18n.
 */
import type { Mode } from '../tiles';
import { DEFAULT_SELECTION } from './presets';
import type { RuleSelection } from './types';

export type RuleOptionId = keyof RuleSelection;
type Value = RuleSelection[RuleOptionId];

export interface RuleOption<T extends Value = Value> {
  readonly id: RuleOptionId;
  readonly label: string;
  readonly description: string;
  readonly kind: 'boolean' | 'enum' | 'number';
  /** Valores possíveis por modalidade (boolean/enum). */
  readonly values?: Readonly<Partial<Record<Mode, readonly T[]>>>;
  readonly range?: { readonly min: number; readonly max: number; readonly step: number };
  readonly default: Readonly<Record<Mode, T>>;
  readonly modes: readonly Mode[];
  readonly group: 'basic' | 'advanced';
  /** Valor fixo (exibir desabilitado com explicação). */
  readonly locked?: Readonly<Partial<Record<Mode, T>>>;
  /** Dependências: a opção só se aplica se `requires(seleção)` for verdadeiro. */
  readonly requires?: (rules: Partial<RuleSelection>) => boolean;
}

const BOTH: readonly Mode[] = ['yonma', 'sanma'];
const BOOL = { yonma: [true, false], sanma: [true, false] } as const;
const POINTS_RANGE = { min: 100, max: 200_000, step: 100 } as const;

const defaults = <K extends RuleOptionId>(id: K): Record<Mode, RuleSelection[K]> => ({
  yonma: DEFAULT_SELECTION.yonma[id],
  sanma: DEFAULT_SELECTION.sanma[id],
});

const key = (id: string) => ({
  label: `rules.${id}.label`,
  description: `rules.${id}.description`,
});

export const RULE_OPTIONS: readonly RuleOption[] = Object.freeze([
  {
    id: 'length',
    ...key('length'),
    kind: 'enum',
    values: { yonma: ['oneHand', 'east', 'south'], sanma: ['oneHand', 'east', 'south'] },
    default: defaults('length'),
    modes: BOTH,
    group: 'basic',
  },
  {
    id: 'startingPoints',
    ...key('startingPoints'),
    kind: 'number',
    range: POINTS_RANGE,
    default: defaults('startingPoints'),
    modes: BOTH,
    group: 'advanced',
  },
  {
    id: 'targetPoints',
    ...key('targetPoints'),
    kind: 'number',
    range: POINTS_RANGE,
    default: defaults('targetPoints'),
    modes: BOTH,
    group: 'advanced',
  },
  {
    id: 'tobi',
    ...key('tobi'),
    kind: 'boolean',
    values: BOOL,
    default: defaults('tobi'),
    modes: BOTH,
    group: 'advanced',
  },
  {
    id: 'agariYame',
    ...key('agariYame'),
    kind: 'boolean',
    values: BOOL,
    default: defaults('agariYame'),
    modes: BOTH,
    group: 'advanced',
  },
  {
    id: 'akaDora',
    ...key('akaDora'),
    kind: 'enum',
    values: { yonma: [0, 3, 4], sanma: [0, 2] },
    default: defaults('akaDora'),
    modes: BOTH,
    group: 'advanced',
  },
  {
    id: 'kuitan',
    ...key('kuitan'),
    kind: 'boolean',
    values: BOOL,
    default: defaults('kuitan'),
    modes: BOTH,
    group: 'advanced',
  },
  {
    id: 'hanMinimum',
    ...key('hanMinimum'),
    kind: 'enum',
    values: { yonma: [1, 2, 4], sanma: [1, 2, 4] },
    default: defaults('hanMinimum'),
    modes: BOTH,
    group: 'advanced',
  },
  {
    id: 'kiriageMangan',
    ...key('kiriageMangan'),
    kind: 'boolean',
    values: BOOL,
    default: defaults('kiriageMangan'),
    modes: BOTH,
    group: 'advanced',
  },
  {
    id: 'tsumoLoss',
    ...key('tsumoLoss'),
    kind: 'boolean',
    values: { sanma: [true, false] },
    default: defaults('tsumoLoss'),
    modes: ['sanma'],
    group: 'advanced',
  },
  {
    id: 'nukiDora',
    ...key('nukiDora'),
    kind: 'boolean',
    values: { sanma: [true] },
    default: defaults('nukiDora'),
    modes: ['sanma'],
    group: 'advanced',
    locked: { sanma: true },
  },
] satisfies RuleOption[]);

export const ruleOption = (id: RuleOptionId): RuleOption | undefined =>
  RULE_OPTIONS.find((o) => o.id === id);
