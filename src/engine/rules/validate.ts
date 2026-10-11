/**
 * Validação de combinações de regras (spec 6.4) e montagem do RuleSet congelado.
 */
import type { Mode } from '../tiles';
import { RULE_OPTIONS, type RuleOptionId } from './options';
import { DEFAULT_SELECTION, FIXED_SANMA, FIXED_YONMA } from './presets';
import type { RuleSelection, RuleSet } from './types';

export type IssueCode =
  | 'unknownOption'
  | 'notInMode'
  | 'invalidValue'
  | 'outOfRange'
  | 'notMultipleOfStep'
  | 'locked'
  | 'targetNotAboveStart'
  | 'lowStartWithTobi';

export interface Issue {
  readonly code: IssueCode;
  readonly optionId: string;
  readonly severity: 'error' | 'warning';
  /** Chave i18n da mensagem. */
  readonly messageKey: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly Issue[];
}

/** Pontos iniciais até este valor, com tobi ligado, geram aviso (um mangan pode encerrar a partida). */
export const LOW_START_WARNING_THRESHOLD = 8_000;

const issue = (
  code: IssueCode,
  optionId: string,
  severity: Issue['severity'] = 'error',
): Issue => ({
  code,
  optionId,
  severity,
  messageKey: `rules.issue.${code}`,
});

/**
 * Valida uma seleção (parcial) de opções para a modalidade. Valores ausentes usam o padrão.
 * Avisos não invalidam a seleção.
 */
export function validateRules(
  mode: Mode,
  selection: Readonly<Record<string, unknown>>,
): ValidationResult {
  const issues: Issue[] = [];

  for (const [id, value] of Object.entries(selection)) {
    const option = RULE_OPTIONS.find((o) => o.id === id);
    if (!option) {
      issues.push(issue('unknownOption', id));
      continue;
    }
    if (!option.modes.includes(mode)) {
      issues.push(issue('notInMode', id));
      continue;
    }
    const locked = option.locked?.[mode];
    if (locked !== undefined && value !== locked) {
      issues.push(issue('locked', id));
      continue;
    }
    if (option.kind === 'number') {
      const range = option.range;
      if (typeof value !== 'number' || !Number.isFinite(value) || !range) {
        issues.push(issue('invalidValue', id));
      } else if (value < range.min || value > range.max) {
        issues.push(issue('outOfRange', id));
      } else if (!Number.isInteger(value / range.step)) {
        issues.push(issue('notMultipleOfStep', id));
      }
      continue;
    }
    const allowed: readonly unknown[] = option.values?.[mode] ?? [];
    if (!allowed.includes(value)) issues.push(issue('invalidValue', id));
  }

  if (!issues.some((i) => i.severity === 'error')) {
    const merged = mergeSelection(mode, selection);
    if (merged.targetPoints <= merged.startingPoints) {
      issues.push(issue('targetNotAboveStart', 'targetPoints', 'warning'));
    }
    if (merged.tobi && merged.startingPoints <= LOW_START_WARNING_THRESHOLD) {
      issues.push(issue('lowStartWithTobi', 'startingPoints', 'warning'));
    }
  }

  return { valid: !issues.some((i) => i.severity === 'error'), issues };
}

function mergeSelection(mode: Mode, selection: Readonly<Record<string, unknown>>): RuleSelection {
  const merged: Record<string, unknown> = { ...DEFAULT_SELECTION[mode] };
  for (const option of RULE_OPTIONS) {
    if (!option.modes.includes(mode)) continue;
    if (option.id in selection) merged[option.id] = selection[option.id];
    const locked = option.locked?.[mode];
    if (locked !== undefined) merged[option.id] = locked;
  }
  return merged as unknown as RuleSelection;
}

export class InvalidRulesError extends Error {
  constructor(readonly issues: readonly Issue[]) {
    super(`Regras inválidas: ${issues.map((i) => `${i.optionId}:${i.code}`).join(', ')}`);
    this.name = 'InvalidRulesError';
  }
}

/**
 * Monta o RuleSet congelado da partida. Com `advanced` desligado vale o preset, exceto as opções
 * do bloco básico (spec 6.5). Lança `InvalidRulesError` se a seleção for inválida.
 */
export function buildRuleSet(
  mode: Mode,
  selection: Readonly<Partial<Record<RuleOptionId, unknown>>> = {},
  advanced = true,
): RuleSet {
  const effective: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(selection)) {
    const option = RULE_OPTIONS.find((o) => o.id === id);
    if (advanced || option?.group === 'basic' || !option) effective[id] = value;
  }
  const result = validateRules(mode, effective);
  if (!result.valid)
    throw new InvalidRulesError(result.issues.filter((i) => i.severity === 'error'));
  const merged = mergeSelection(mode, effective);
  const fixed = mode === 'yonma' ? FIXED_YONMA : FIXED_SANMA;
  return Object.freeze({ mode, ...merged, ...fixed });
}
