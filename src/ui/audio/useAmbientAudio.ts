/**
 * Música ambiente e som de hover em todo o site. A música começa no primeiro gesto do usuário
 * (política de autoplay) e muda de clima entre o menu e a mesa.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resumeAudio } from '../../audio/context';
import { playHover, setHoverVolume } from '../../audio/hover';
import { music } from '../../audio/music';
import { useSettings } from '../../state/settings';

/** Elementos que fazem som ao receber o mouse. */
const BUTTONS = 'button:not(:disabled), a[href], [role="radio"], [role="switch"], select';
const HAND_TILE = '[data-hover-zone="hand"] [data-tile]';

export function useAmbientAudio(): void {
  const { pathname } = useLocation();
  const musicOn = useSettings((s) => s.music);
  const musicVolume = useSettings((s) => s.musicVolume);
  const volume = useSettings((s) => s.volume);
  const muted = useSettings((s) => s.muted);
  const hoverOn = useSettings((s) => s.hoverSounds);
  const mood = pathname.startsWith('/partida') ? 'table' : 'menu';

  // Volume final: geral × música; mudo zera tudo.
  useEffect(() => {
    music.setVolume(muted ? 0 : volume * musicVolume);
    setHoverVolume(muted || !hoverOn ? 0 : volume);
  }, [volume, musicVolume, muted, hoverOn]);

  useEffect(() => music.setMood(mood), [mood]);

  // Liga/desliga; o início real espera um gesto do usuário.
  useEffect(() => {
    if (!musicOn) {
      music.stop();
      return;
    }
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      void resumeAudio().then(() => music.start(mood));
    };
    globalThis.addEventListener('pointerdown', begin, { once: true });
    globalThis.addEventListener('keydown', begin, { once: true });
    return () => {
      globalThis.removeEventListener('pointerdown', begin);
      globalThis.removeEventListener('keydown', begin);
    };
    // O clima muda sem reiniciar a música (efeito acima).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicOn]);

  // Som ao passar o mouse: só quando entra num elemento novo, e só com mouse de verdade.
  useEffect(() => {
    if (!hoverOn) return;
    let current: Element | null = null;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !(e.target instanceof Element)) return;
      const tile = e.target.closest(HAND_TILE);
      const target = tile ?? e.target.closest(BUTTONS);
      if (target === current) return;
      current = target;
      if (!target) return;
      void resumeAudio();
      playHover(tile ? 'tile' : 'button');
    };
    document.addEventListener('pointerover', onOver);
    return () => document.removeEventListener('pointerover', onOver);
  }, [hoverOn]);
}
