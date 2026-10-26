/** Regras de exibição do rio de descartes (sem React, testáveis à parte). */
import type { DiscardEntry } from '../../engine';

/**
 * Peças que ficam no rio: a chamada sai (vai para o grupo de quem chamou, como no Mahjong Soul). Se a
 * chamada era a do riichi, a próxima peça que ficou no rio é que aparece deitada.
 */
export function visibleDiscards(
  discards: readonly DiscardEntry[],
): { entry: DiscardEntry; sideways: boolean }[] {
  const out: { entry: DiscardEntry; sideways: boolean }[] = [];
  let riichiPending = false;
  for (const d of discards) {
    if (d.calledBy !== null) {
      riichiPending ||= d.riichi;
      continue;
    }
    out.push({ entry: d, sideways: d.riichi || riichiPending });
    riichiPending = false;
  }
  return out;
}
