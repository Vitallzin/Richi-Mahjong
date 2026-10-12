/**
 * Relógio por jogada (spec 10.4). Tempo base volta cheio a cada jogada; o excedente sai do banco,
 * que só diminui e volta cheio a cada mão (`bankRefill = 'hand'`).
 */

export type TimerSettings =
  | { readonly mode: 'timed'; readonly baseSeconds: number; readonly bankSeconds: number }
  | { readonly mode: 'unlimited' };

export type TimerPresetId = '3+5' | '5+10' | '5+20' | '60+0' | '300+0' | 'unlimited';

export const TIMER_PRESETS: Readonly<Record<TimerPresetId, TimerSettings>> = Object.freeze({
  '3+5': { mode: 'timed', baseSeconds: 3, bankSeconds: 5 },
  '5+10': { mode: 'timed', baseSeconds: 5, bankSeconds: 10 },
  '5+20': { mode: 'timed', baseSeconds: 5, bankSeconds: 20 },
  '60+0': { mode: 'timed', baseSeconds: 60, bankSeconds: 0 },
  '300+0': { mode: 'timed', baseSeconds: 300, bankSeconds: 0 },
  unlimited: { mode: 'unlimited' },
});

export const DEFAULT_TIMER: TimerSettings = TIMER_PRESETS['5+20'];

/** Quando o banco é reabastecido. Constante para fácil ajuste (spec 10.4). */
export const BANK_REFILL = 'hand' as const;

export const TIMER_LIMITS = Object.freeze({
  base: { min: 1, max: 60 },
  bank: { min: 0, max: 300 },
});

export function validateTimer(t: TimerSettings): boolean {
  if (t.mode === 'unlimited') return true;
  const { base, bank } = TIMER_LIMITS;
  return (
    Number.isInteger(t.baseSeconds) &&
    Number.isInteger(t.bankSeconds) &&
    t.baseSeconds >= base.min &&
    t.baseSeconds <= base.max &&
    t.bankSeconds >= bank.min &&
    t.bankSeconds <= bank.max
  );
}

export function presetOf(t: TimerSettings): TimerPresetId | 'custom' {
  for (const [id, p] of Object.entries(TIMER_PRESETS) as [TimerPresetId, TimerSettings][]) {
    if (
      p.mode === t.mode &&
      (p.mode === 'unlimited' ||
        (t.mode === 'timed' && p.baseSeconds === t.baseSeconds && p.bankSeconds === t.bankSeconds))
    ) {
      return id;
    }
  }
  return 'custom';
}

export interface ClockReading {
  readonly baseMs: number;
  readonly bankMs: number;
  readonly expired: boolean;
}

/**
 * Consome `elapsedMs` de uma jogada: primeiro a base, depois o banco. Ex.: 5+20 com 6 s ⇒ base 0,
 * banco 19 s (exibido "5-19" na jogada seguinte, quando a base volta).
 */
export function consume(baseMs: number, bankMs: number, elapsedMs: number): ClockReading {
  const fromBase = Math.min(baseMs, elapsedMs);
  const rest = elapsedMs - fromBase;
  const fromBank = Math.min(bankMs, rest);
  return {
    baseMs: baseMs - fromBase,
    bankMs: bankMs - fromBank,
    expired: rest > bankMs,
  };
}

/** Texto do relógio: `base-banco` (ex.: "5-19"); sem banco, só a base. */
export function formatClock(
  reading: Pick<ClockReading, 'baseMs' | 'bankMs'>,
  hasBank: boolean,
): string {
  const base = Math.ceil(reading.baseMs / 1000);
  if (!hasBank) return String(base);
  return `${base}-${Math.ceil(reading.bankMs / 1000)}`;
}
