import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useSettings } from '../state/settings';
import { applyAppearance } from '../theme/appearance';
import { MigrationPrompt } from './components/MigrationPrompt';
import { devSignIn, initAccount } from '../state/account';
import { useAmbientAudio } from './audio/useAmbientAudio';
import { useRouteTransition } from './platform/routeTransition';
import { MainMenu } from './screens/MainMenu';
import { NotFound } from './screens/NotFound';

// Telas carregadas sob demanda: o menu abre rápido no celular (aceite de desempenho, Fase 6).
// Depois que o menu aparece, todas são baixadas em segundo plano: a primeira troca de tela já anima
// sem travar esperando o código chegar.
const preloads: (() => Promise<unknown>)[] = [];

function screen<K extends string, M extends Record<K, ComponentType>>(
  load: () => Promise<M>,
  name: K,
) {
  preloads.push(load);
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

const AppearanceScreen = screen(() => import('./screens/AppearanceScreen'), 'AppearanceScreen');
const HistoryScreen = screen(() => import('./screens/HistoryScreen'), 'HistoryScreen');
const ProfileScreen = screen(() => import('./screens/ProfileScreen'), 'ProfileScreen');
const RoomScreen = screen(() => import('./screens/RoomScreen'), 'RoomScreen');
const RoomsScreen = screen(() => import('./screens/RoomsScreen'), 'RoomsScreen');
const HelpsScreen = screen(() => import('./screens/HelpsScreen'), 'HelpsScreen');
const SettingsScreen = screen(() => import('./screens/SettingsScreen'), 'SettingsScreen');
const WelcomeScreen = screen(() => import('./screens/WelcomeScreen'), 'WelcomeScreen');
const TutorialScreen = screen(() => import('./tutorial/TutorialScreen'), 'TutorialScreen');
const DevTiles = lazy(() => import('./screens/DevTiles').then((m) => ({ default: m.DevTiles })));
const SetupScreen = screen(() => import('./screens/SetupScreen'), 'SetupScreen');
const TableScreen = screen(() => import('./screens/TableScreen'), 'TableScreen');

/** Baixa as telas quando o navegador estiver livre (sem atrapalhar a abertura do menu). */
function preloadScreens(): () => void {
  const run = () => {
    for (const load of preloads) void load().catch(() => undefined);
  };
  if (typeof globalThis.requestIdleCallback === 'function') {
    const id = globalThis.requestIdleCallback(run, { timeout: 2500 });
    return () => globalThis.cancelIdleCallback(id);
  }
  const id = setTimeout(run, 1200);
  return () => clearTimeout(id);
}

/** Rotas da spec 10.1. */
export function App() {
  const a11y = useSettings((s) => s.accessibility);
  const appearance = useSettings((s) => s.appearance);
  useAmbientAudio();
  // Entrada e saída animadas de cada tela.
  const location = useRouteTransition();
  // Conta: só carrega o Firebase se o jogador já entrou neste aparelho (spec 12.1).
  useEffect(() => preloadScreens(), []);
  useEffect(() => {
    initAccount();
    if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true')
      Object.assign(globalThis, { __devSignIn: devSignIn });
  }, []);
  // Acessibilidade global (spec 10.7): atributos no <html> lidos pelo CSS.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reduceMotion = String(a11y.reduceMotion);
    root.dataset.highContrast = String(a11y.highContrast);
  }, [a11y.reduceMotion, a11y.highContrast]);
  // Aparência escolhida (spec 11.2): variáveis CSS no <html>.
  useEffect(() => applyAppearance(appearance), [appearance]);
  return (
    <>
      <MigrationPrompt />
      <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
        <Routes location={location}>
          <Route path="/" element={<MainMenu />} />
          <Route path="/jogar" element={<SetupScreen />} />
          <Route path="/partida" element={<TableScreen />} />
          <Route path="/tutorial/:capitulo?" element={<TutorialScreen />} />
          <Route path="/boas-vindas" element={<WelcomeScreen />} />
          <Route path="/ajudas" element={<HelpsScreen />} />
          <Route path="/configuracoes" element={<SettingsScreen />} />
          <Route path="/aparencia" element={<AppearanceScreen />} />
          <Route path="/perfil" element={<ProfileScreen />} />
          <Route path="/historico" element={<HistoryScreen />} />
          <Route path="/salas" element={<RoomsScreen />} />
          <Route path="/sala/:codigo" element={<RoomScreen />} />
          {import.meta.env.DEV && <Route path="/dev/pecas" element={<DevTiles />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
