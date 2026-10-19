// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_SETTINGS, useSettings } from '../../state/settings';
import { SetupScreen } from './SetupScreen';

const renderSetup = () =>
  render(
    <MemoryRouter>
      <SetupScreen />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ ...DEFAULT_SETTINGS });
});

describe('Jogar partida (spec 6.6)', () => {
  it('começa com 5+20 e regras padrão; avançadas escondidas', () => {
    renderSetup();
    expect(screen.getByRole('radio', { name: '5+20' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Regras padrão')).toBeInTheDocument();
    expect(screen.queryByText('Tanyao aberto')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeEnabled();
  });

  it('avançadas: controles gerados das opções; valor inválido bloqueia o início com mensagem', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('radio', { name: 'Ativadas' }));
    expect(screen.getByText('Tanyao aberto')).toBeInTheDocument();
    expect(screen.queryByText('Tsumo-loss')).not.toBeInTheDocument(); // só no sanma
    fireEvent.change(screen.getByLabelText('Pontos iniciais'), { target: { value: '25050' } });
    expect(screen.getByText('Use um múltiplo de 100.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Pontos iniciais'), { target: { value: '30000' } });
    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeEnabled();
    // aviso não bloqueia: alvo (30.000) ≤ pontos iniciais
    expect(screen.getByText(/a partida nunca será estendida/)).toBeInTheDocument();
    expect(screen.getByText(/Diferente do padrão/)).toBeInTheDocument();
  });

  it('tempo personalizado é validado', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('radio', { name: 'Personalizado' }));
    fireEvent.change(screen.getByLabelText('Segundos por jogada'), { target: { value: '0' } });
    expect(screen.getByText(/Use de 1 a 60 segundos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeDisabled();
  });

  it('modo de 3 jogadores: 2 adversários e regras próprias (tsumo-loss, kita travado)', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('radio', { name: '3 jogadores' }));
    expect(useSettings.getState().mode).toBe('sanma');
    expect(screen.getByText(/108 peças/)).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    fireEvent.click(screen.getByRole('radio', { name: 'Ativadas' }));
    expect(screen.getByText('Tsumo-loss')).toBeInTheDocument();
    expect(screen.getByLabelText('Pontos iniciais')).toHaveValue(35000);
    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeEnabled();
  });
});
