/**
 * Orientação e tela durante a partida (spec 10.6): tenta tela cheia + trava em paisagem (Android);
 * se não der (iPhone) e o aparelho estiver em pé, o palco gira 90° por CSS. Mantém a tela acesa.
 */
import { useEffect, useState } from 'react';

type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> };

let wakeLock: WakeLockSentinel | null = null;
let orientationLocked = false;

/** Chamar a partir de um gesto do usuário (clique em "Iniciar partida"). */
export async function enterGameDisplay(): Promise<void> {
  const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
  try {
    if (coarse && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch {
    // iPhone/Safari: sem tela cheia; segue com rotação por CSS.
  }
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    if (coarse && orientation?.lock) {
      await orientation.lock('landscape');
      orientationLocked = true;
    }
  } catch {
    orientationLocked = false;
  }
  await requestWakeLock();
}

export async function exitGameDisplay(): Promise<void> {
  try {
    if (orientationLocked) screen.orientation.unlock();
  } catch {
    // ignora
  }
  orientationLocked = false;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // ignora
  }
  await wakeLock?.release().catch(() => undefined);
  wakeLock = null;
}

export async function requestWakeLock(): Promise<void> {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {
    wakeLock = null;
  }
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // ignora
  }
}

/** O palco deve ser girado por CSS (aparelho em pé e sem trava de orientação). */
export function useNeedsRotation(): boolean {
  const query = '(orientation: portrait) and (pointer: coarse)';
  const [portrait, setPortrait] = useState(() => globalThis.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = globalThis.matchMedia?.(query);
    if (!mq) return;
    const update = () => setPortrait(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return portrait && !orientationLocked;
}
