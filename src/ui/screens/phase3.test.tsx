// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CHAPTERS } from '../../content/tutorial';
import { DEFAULT_SETTINGS, useSettings } from '../../state/settings';
import { parseBlocks } from '../tutorial/markdownParse';
import { TutorialScreen } from '../tutorial/TutorialScreen';
import { HelpsScreen } from './HelpsScreen';
import { MainMenu } from './MainMenu';
import { WelcomeScreen } from './WelcomeScreen';

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ ...DEFAULT_SETTINGS });
});

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/boas-vindas" element={<WelcomeScreen />} />
        <Route path="/ajudas" element={<HelpsScreen />} />
        <Route path="/jogar" element={<p>configurar</p>} />
        <Route path="/tutorial/:capitulo?" element={<TutorialScreen />} />
      </Routes>
    </MemoryRouter>,
  );

describe('boas-vindas (spec 9.1)', () => {
  it('no primeiro uso, "Jogar" passa pelas boas-vindas; depois vai direto', () => {
    at('/');
    expect(screen.getByRole('link', { name: 'Jogar' })).toHaveAttribute('href', '/boas-vindas');
    fireEvent.click(screen.getByRole('link', { name: 'Jogar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decidir depois' }));
    expect(screen.getByText('configurar')).toBeInTheDocument();
    expect(useSettings.getState().welcomeSeen).toBe(true);
  });
});

describe('ajudas liga/desliga e persistidas (aceite da Fase 3)', () => {
  it('cada ajuda é um interruptor salvo em settings:v1', () => {
    at('/ajudas');
    const sw = screen.getByRole('switch', { name: 'Aviso de furiten' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(useSettings.getState().helps.furiten).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Sem chamadas' }));
    expect(useSettings.getState().helps.noCalls).toBe(true);
    const saved = JSON.parse(localStorage.getItem('settings:v1') ?? '{}') as {
      state: { helps: { furiten: boolean; noCalls: boolean } };
    };
    expect(saved.state.helps).toMatchObject({ furiten: false, noCalls: true });
  });

  it('rótulos configuráveis aparecem na prévia', () => {
    at('/ajudas');
    expect(screen.getAllByText('Leste').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('radio', { name: 'Abreviado (L/S/O/N)' }));
    expect(useSettings.getState().helps.labels.winds).toBe('abbr');
    fireEvent.click(screen.getByRole('radio', { name: 'Abreviado (Br/Vd/Vm)' }));
    expect(screen.getByText('Vd')).toBeInTheDocument();
  });
});

describe('tutorial (spec 10.8)', () => {
  it('tem 6 capítulos, navegação e pedras desenhadas', () => {
    expect(CHAPTERS).toHaveLength(6);
    at('/tutorial/pedras');
    expect(screen.getByRole('heading', { level: 1, name: '1. As pedras' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: '5 de bambu, vermelho' }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('link', { name: /^Próximo/ }));
    expect(
      screen.getByRole('heading', { level: 1, name: '2. Como formar uma mão' }),
    ).toBeInTheDocument();
  });

  it('capítulo inexistente mostra aviso', () => {
    at('/tutorial/xyz');
    expect(screen.getByText('Capítulo não encontrado.')).toBeInTheDocument();
  });

  it('o Markdown vira blocos sem HTML cru', () => {
    const blocks = parseBlocks(
      '# Título\n\nTexto **forte**\ncontinua.\n\n- item 1\n- item 2\n\n> nota\n\n<script>x</script>',
    );
    expect(blocks.map((b) => b.kind)).toEqual(['h', 'p', 'ul', 'quote', 'p']);
    expect(blocks[1]).toEqual({ kind: 'p', text: 'Texto **forte** continua.' });
  });
});
