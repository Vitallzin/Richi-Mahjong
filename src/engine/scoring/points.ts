/** Pontos básicos e limites (spec 7.10). */
import type { RuleSet } from '../rules';

export type LimitName = 'none' | 'mangan' | 'haneman' | 'baiman' | 'sanbaiman' | 'yakuman';

export const roundUp100 = (n: number): number => Math.ceil(n / 100) * 100;

export const MANGAN_BASE = 2000;
export const YAKUMAN_BASE = 8000;

export interface BasicPoints {
  readonly base: number;
  readonly limit: LimitName;
  /** Multiplicador de yakuman (inclui kazoe = 1). 0 se não for yakuman. */
  readonly yakumanMultiplier: number;
  readonly kazoe: boolean;
}

/** Pontos básicos de uma mão com yaku normais (yakumanCount = 0) ou de yakuman. */
export function basicPoints(
  han: number,
  fu: number,
  yakumanCount: number,
  rules: Pick<RuleSet, 'kiriageMangan' | 'kazoeYakuman'>,
): BasicPoints {
  if (yakumanCount > 0) {
    return {
      base: YAKUMAN_BASE * yakumanCount,
      limit: 'yakuman',
      yakumanMultiplier: yakumanCount,
      kazoe: false,
    };
  }
  if (han >= 13 && rules.kazoeYakuman) {
    return { base: YAKUMAN_BASE, limit: 'yakuman', yakumanMultiplier: 1, kazoe: true };
  }
  const limited = (base: number, limit: LimitName): BasicPoints => ({
    base,
    limit,
    yakumanMultiplier: 0,
    kazoe: false,
  });
  if (han >= 11) return limited(6000, 'sanbaiman');
  if (han >= 8) return limited(4000, 'baiman');
  if (han >= 6) return limited(3000, 'haneman');
  if (han >= 5) return limited(MANGAN_BASE, 'mangan');
  if (rules.kiriageMangan && ((han === 4 && fu === 30) || (han === 3 && fu === 60))) {
    return limited(MANGAN_BASE, 'mangan');
  }
  const base = fu * 2 ** (han + 2);
  return base >= MANGAN_BASE ? limited(MANGAN_BASE, 'mangan') : limited(base, 'none');
}
