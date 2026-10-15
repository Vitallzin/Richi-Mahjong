import { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  document.documentElement.dataset.reduceMotion === 'true' ||
  (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/**
 * Número que rola de `from` até `to` (placar), começando após `delayMs`. Com "reduzir movimento",
 * vai direto ao valor final.
 */
export function useCountUp(
  from: number,
  to: number,
  durationMs: number,
  delayMs: number,
  active: boolean,
): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion() || from === to) {
      const id = globalThis.setTimeout(() => setValue(to), 0);
      return () => globalThis.clearTimeout(id);
    }
    let frame = 0;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    const timer = globalThis.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      globalThis.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [from, to, durationMs, delayMs, active]);
  return active ? value : from;
}
