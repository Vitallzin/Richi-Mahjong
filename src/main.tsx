import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Fontes auto-hospedadas só com as fatias usadas (gerado por npm run fonts).
import './ui/styles/fonts.css';
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
