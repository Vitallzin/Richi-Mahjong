// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { buildRuleSet } from '../../engine';
import { TIMER_PRESETS, type RoomMeta } from '../../session';
import type { RoomConfig } from '../../state/roomController';
import { applyRoomConfig } from '../../state/roomConfig';
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
    // Um seletor de personagem por adversário.
    expect(screen.getAllByRole('button', { name: /^Assento \d:/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /^Assento 1:/ }));
    fireEvent.click(screen.getByRole('option', { name: /Akari/ }));
    expect(useSettings.getState().characters[0]).toBe('akari');
    fireEvent.click(screen.getByRole('radio', { name: 'Ativadas' }));
    expect(screen.getByText('Tsumo-loss')).toBeInTheDocument();
    expect(screen.getByLabelText('Pontos iniciais')).toHaveValue(35000);
    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeEnabled();
  });
});

describe('Editar regras da sala (fase 3)', () => {
  const renderEdit = (onSave: (c: RoomConfig) => Promise<void>) =>
    render(
      <MemoryRouter>
        <SetupScreen editRoom={{ onSave, onBack: () => undefined }} />
      </MemoryRouter>,
    );

  it('mostra as regras carregadas da sala e salva a configuração nova', async () => {
    const meta = {
      rules: JSON.stringify(buildRuleSet('sanma', {}, false)),
      settings: JSON.stringify({
        timer: TIMER_PRESETS['60+0'],
        training: false,
        difficulty: 'hard',
        characters: ['ren', 'akari'],
      }),
    } as RoomMeta;
    applyRoomConfig(meta);
    const onSave = vi.fn((_c: RoomConfig) => Promise.resolve());
    renderEdit(onSave);
    expect(screen.getByRole('heading', { name: 'Regras da sala' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '3 jogadores' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: '60+0' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: '4 jogadores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar regras' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const config = onSave.mock.calls[0]![0];
    expect(config).toMatchObject({ mode: 'yonma', players: 4 });
    expect(JSON.parse(config.settings)).toMatchObject({ difficulty: 'hard' });
  });

  it('sem lugar para trocar para 3 jogadores: avisa e não sai da tela', async () => {
    renderEdit(() => Promise.reject(new Error('seatsFull')));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar regras' }));
    expect(await screen.findByText(/deixe um lugar livre/)).toBeInTheDocument();
  });
});
