/**
 * Transição entre telas: a tela antiga sai e a nova entra (View Transitions API, animações em
 * global.css). Sem suporte no navegador ou com "reduzir movimento", a troca é imediata.
 */
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, type Location } from 'react-router-dom';
import { useSettings } from '../../state/settings';

/**
 * Espera máxima pela tela nova (carregada sob demanda) antes de animar a entrada. Durante a espera
 * a página fica congelada na tela antiga; as telas já são baixadas em segundo plano após o menu,
 * então passado isso é melhor mostrar o "carregando" do que travar.
 */
const MAX_WAIT_MS = 350;

/** Primeiro trecho do caminho: capítulos do tutorial ou ?sala=1 não contam como tela nova. */
const sectionOf = (path: string) => path.split('/')[1] ?? '';

const prefersReducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const canAnimate = (reduceMotion: boolean) =>
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function' &&
  !reduceMotion &&
  !prefersReducedMotion();

/**
 * Espera o Suspense trocar o "carregando" pela tela de verdade (ou desiste depois de um tempo).
 * Com setTimeout, não requestAnimationFrame: em aba de fundo os quadros param e a tela travaria.
 */
function untilLoaded(): Promise<void> {
  const start = performance.now();
  return new Promise((resolve) => {
    const check = () => {
      if (!document.querySelector('.route-loading') || performance.now() - start > MAX_WAIT_MS)
        resolve();
      else setTimeout(check, 16);
    };
    check();
  });
}

/** Roda uma troca de interface dentro de uma transição animada, se possível. */
export function withViewTransition(update: () => void, reduceMotion: boolean): void {
  if (!canAnimate(reduceMotion)) {
    update();
    return;
  }
  document.startViewTransition(async () => {
    flushSync(update);
    await untilLoaded();
  });
}

/**
 * Local exibido pelas rotas: durante a troca de tela continua o antigo até a transição capturá-lo,
 * e então passa ao novo.
 */
export function useRouteTransition(): Location {
  const location = useLocation();
  const reduceMotion = useSettings((s) => s.accessibility.reduceMotion);
  const [shown, setShown] = useState(location);
  const changing = sectionOf(location.pathname) !== sectionOf(shown.pathname);
  const animate = canAnimate(reduceMotion);
  useEffect(() => {
    if (!changing) return;
    const id = setTimeout(() => withViewTransition(() => setShown(location), reduceMotion), 0);
    return () => clearTimeout(id);
  }, [changing, location, reduceMotion]);
  return changing && animate ? shown : location;
}
