/** Falas curtas dos personagens (spec 8.3): última fala, derivada dos eventos de cada atualização. */
import { useState } from 'react';
import type { PlayerEvent } from '../../engine';
import { tKey } from '../../i18n';
import type { SeatSetup } from '../../session';

export interface Speech {
  readonly tick: number;
  readonly seat: number;
  readonly text: string;
}

function speechIn(
  events: readonly PlayerEvent[],
  seats: readonly SeatSetup[],
): Omit<Speech, 'tick'> | null {
  for (const e of events) {
    const seat =
      e.type === 'RiichiDeclared' ? e.seat : e.type === 'HandWon' ? e.wins[0]?.seat : undefined;
    if (seat === undefined) continue;
    const setup = seats[seat];
    if (setup?.kind !== 'bot') continue;
    const kind = e.type === 'RiichiDeclared' ? 'riichi' : 'win';
    return { seat, text: tKey(`characters.${setup.characterId}.say.${kind}`) };
  }
  return null;
}

/** Última fala (estado derivado dos eventos de cada atualização). */
export function useSpeech(
  events: readonly PlayerEvent[],
  tick: number,
  seats: readonly SeatSetup[],
): Speech | null {
  const [speech, setSpeech] = useState<Speech | null>(null);
  const [seen, setSeen] = useState(tick);
  if (seen !== tick) {
    setSeen(tick);
    const found = speechIn(events, seats);
    if (found) setSpeech({ ...found, tick });
  }
  return speech;
}
