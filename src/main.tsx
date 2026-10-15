import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
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
