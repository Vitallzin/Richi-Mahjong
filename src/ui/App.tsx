import { Route, Routes } from 'react-router-dom';
import { MainMenu } from './screens/MainMenu';
import { NotFound } from './screens/NotFound';
import { UnderConstruction } from './screens/UnderConstruction';

/** Rotas da spec 10.1. As telas ainda não implementadas mostram "Em construção". */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/jogar" element={<UnderConstruction />} />
      <Route path="/partida" element={<UnderConstruction />} />
      <Route path="/tutorial/:capitulo?" element={<UnderConstruction />} />
      <Route path="/ajudas" element={<UnderConstruction />} />
      <Route path="/configuracoes" element={<UnderConstruction />} />
      <Route path="/aparencia" element={<UnderConstruction />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
