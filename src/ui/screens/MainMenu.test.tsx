// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('Menu principal', () => {
  it('mostra o título e os itens do menu em português', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Riichi Mahjong' })).toBeInTheDocument();
    // No primeiro uso, passa pelas boas-vindas (spec 9.1).
    expect(screen.getByRole('link', { name: 'Jogar' })).toHaveAttribute('href', '/boas-vindas');
    // Fase 5: salas liberadas; sem login, o canto mostra "Entrar".
    expect(screen.getByRole('link', { name: 'Salas privadas' })).toHaveAttribute('href', '/salas');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/perfil');
  });

  it('mostra página não encontrada para rotas desconhecidas', () => {
    renderAt('/nao-existe');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});
