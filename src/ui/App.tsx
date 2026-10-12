import { Route, Routes } from 'react-router-dom';
import { MainMenu } from './screens/MainMenu';
import { NotFound } from './screens/NotFound';
import { UnderConstruction } from './screens/UnderConstruction';
import { DevTiles } from './screens/DevTiles';
import { SetupScreen } from './screens/SetupScreen';
import { TableScreen } from './screens/TableScreen';

/** Rotas da spec 10.1. As telas ainda não implementadas mostram "Em construção". */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/jogar" element={<SetupScreen />} />
      <Route path="/partida" element={<TableScreen />} />
      <Route path="/tutorial/:capitulo?" element={<UnderConstruction />} />
      <Route path="/ajudas" element={<UnderConstruction />} />
      <Route path="/configuracoes" element={<UnderConstruction />} />
      <Route path="/aparencia" element={<UnderConstruction />} />
      {import.meta.env.DEV && <Route path="/dev/pecas" element={<DevTiles />} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
