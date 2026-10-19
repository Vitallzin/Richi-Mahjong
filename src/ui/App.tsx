import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useSettings } from '../state/settings';
import { applyAppearance } from '../theme/appearance';
import { AppearanceScreen } from './screens/AppearanceScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RoomScreen } from './screens/RoomScreen';
import { RoomsScreen } from './screens/RoomsScreen';
import { MigrationPrompt } from './components/MigrationPrompt';
import { devSignIn, initAccount } from '../state/account';
import { useAmbientAudio } from './audio/useAmbientAudio';
import { HelpsScreen } from './screens/HelpsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { TutorialScreen } from './tutorial/TutorialScreen';
import { MainMenu } from './screens/MainMenu';
import { NotFound } from './screens/NotFound';
import { DevTiles } from './screens/DevTiles';
import { SetupScreen } from './screens/SetupScreen';
import { TableScreen } from './screens/TableScreen';

/** Rotas da spec 10.1. */
export function App() {
  const a11y = useSettings((s) => s.accessibility);
  const appearance = useSettings((s) => s.appearance);
  useAmbientAudio();
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
      <Routes>
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
    </>
  );
}
