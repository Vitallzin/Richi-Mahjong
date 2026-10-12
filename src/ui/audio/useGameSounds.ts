import { useEffect } from 'react';
import { play, preloadSounds, setAudio, soundFor } from '../../audio/sounds';
import type { PlayerEvent, Seat } from '../../engine';
import { useSettings } from '../../state/settings';

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
    if (last) play(last);
  }, [tick, events, localSeat]);
}
