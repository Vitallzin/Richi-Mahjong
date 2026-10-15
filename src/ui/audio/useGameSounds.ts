import { useEffect } from 'react';
import { play, preloadSounds, setAudio, soundFor, type SoundId } from '../../audio/sounds';
import type { PlayerEvent, Seat } from '../../engine';
import { PACING } from '../../session';
import { useSettings } from '../../state/settings';

/** O estalo do descarte toca quando a pedra pousa no rio, no fim do voo. */
const DELAY: Partial<Record<SoundId, number>> = {
  discard: Math.round(PACING.discardFlightMs * 0.7),
};

/** Toca os sons dos eventos de cada atualização da partida. */
export function useGameSounds(events: readonly PlayerEvent[], tick: number, localSeat: Seat): void {
  const volume = useSettings((s) => s.volume);
  const muted = useSettings((s) => s.muted);

  useEffect(() => preloadSounds(), []);
  useEffect(() => setAudio(volume, muted), [volume, muted]);

  useEffect(() => {
    // Um som por atualização basta (o mais importante é o último evento relevante).
    const ids = events.map((e) => soundFor(e, localSeat)).filter((x) => x !== null);
    const last = ids[ids.length - 1];
    if (!last) return;
    const delay = DELAY[last] ?? 0;
    if (delay === 0) {
      play(last);
      return;
    }
    const id = globalThis.setTimeout(() => play(last), delay);
    return () => globalThis.clearTimeout(id);
  }, [tick, events, localSeat]);
}
