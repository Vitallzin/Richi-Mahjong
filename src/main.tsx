import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/700.css';
import '@fontsource/shippori-mincho/600.css';
import '@fontsource/shippori-mincho/800.css';
import { App } from './ui/App';
import './ui/styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
