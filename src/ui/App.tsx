import { lazy, Suspense, useEffect } from 'react';
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
const AppearanceScreen = lazy(() =>
  import('./screens/AppearanceScreen').then((m) => ({ default: m.AppearanceScreen })),
);
const HistoryScreen = lazy(() =>
  import('./screens/HistoryScreen').then((m) => ({ default: m.HistoryScreen })),
);
const ProfileScreen = lazy(() =>
  import('./screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })),
);
const RoomScreen = lazy(() =>
  import('./screens/RoomScreen').then((m) => ({ default: m.RoomScreen })),
);
const RoomsScreen = lazy(() =>
  import('./screens/RoomsScreen').then((m) => ({ default: m.RoomsScreen })),
);
const HelpsScreen = lazy(() =>
  import('./screens/HelpsScreen').then((m) => ({ default: m.HelpsScreen })),
);
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
const WelcomeScreen = lazy(() =>
  import('./screens/WelcomeScreen').then((m) => ({ default: m.WelcomeScreen })),
);
const TutorialScreen = lazy(() =>
  import('./tutorial/TutorialScreen').then((m) => ({ default: m.TutorialScreen })),
);
const DevTiles = lazy(() => import('./screens/DevTiles').then((m) => ({ default: m.DevTiles })));
const SetupScreen = lazy(() =>
  import('./screens/SetupScreen').then((m) => ({ default: m.SetupScreen })),
);
const TableScreen = lazy(() =>
  import('./screens/TableScreen').then((m) => ({ default: m.TableScreen })),
);

/** Rotas da spec 10.1. */
export function App() {
  const a11y = useSettings((s) => s.accessibility);
  const appearance = useSettings((s) => s.appearance);
  useAmbientAudio();
  // Entrada e saída animadas de cada tela.
  const location = useRouteTransition();
  // Conta: só carrega o Firebase se o jogador já entrou neste aparelho (spec 12.1).
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
