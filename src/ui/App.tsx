import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useSettings } from '../state/settings';
import { applyAppearance } from '../theme/appearance';
import { AppearanceScreen } from './screens/AppearanceScreen';
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
  // Acessibilidade global (spec 10.7): atributos no <html> lidos pelo CSS.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reduceMotion = String(a11y.reduceMotion);
    root.dataset.highContrast = String(a11y.highContrast);
  }, [a11y.reduceMotion, a11y.highContrast]);
  // Aparência escolhida (spec 11.2): variáveis CSS no <html>.
  useEffect(() => applyAppearance(appearance), [appearance]);
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/jogar" element={<SetupScreen />} />
      <Route path="/partida" element={<TableScreen />} />
      <Route path="/tutorial/:capitulo?" element={<TutorialScreen />} />
      <Route path="/boas-vindas" element={<WelcomeScreen />} />
      <Route path="/ajudas" element={<HelpsScreen />} />
      <Route path="/configuracoes" element={<SettingsScreen />} />
      <Route path="/aparencia" element={<AppearanceScreen />} />
      {import.meta.env.DEV && <Route path="/dev/pecas" element={<DevTiles />} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
