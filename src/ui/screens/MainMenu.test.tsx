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
    expect(screen.getByRole('link', { name: 'Jogar partida' })).toHaveAttribute('href', '/jogar');
    expect(screen.getByText('Salas privadas')).toHaveAttribute('aria-disabled', 'true');
  });

  it('mostra página não encontrada para rotas desconhecidas', () => {
    renderAt('/nao-existe');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});
