// @vitest-environment jsdom
// Mesa numa sala online (ADR 0020): código à vista, "(bot)", avisos, "Voltar a jogar" e a saída.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PRESET_YONMA, type Seat } from '../../engine';
import { LocalSession, NO_DELAYS, type SeatSetup } from '../../session';
import { Table, type TableRoom } from './Table';

const SEATS: SeatSetup[] = [
  { kind: 'human', name: 'Ana', uid: 'ana' },
  {
    kind: 'human',
    name: 'Bia',
    uid: 'bia',
    avatar: 'google',
    photoURL: 'https://lh3.googleusercontent.com/a/bia',
  },
  { kind: 'bot', skill: 'normal', characterId: 'ren' },
  { kind: 'bot', skill: 'normal', characterId: 'akari' },
];

function renderTable(room: Partial<TableRoom> = {}) {
  const session = LocalSession.create(
    PRESET_YONMA,
    { timer: { mode: 'unlimited' }, training: false },
    SEATS,
    0,
    { delays: NO_DELAYS, autosave: false },
  );
  const onResume = vi.fn();
  const onExit = vi.fn();
  const full: TableRoom = {
    code: 'ABC234',
    isHost: false,
    covered: new Set<Seat>([1]),
    myCover: null,
    notices: [{ id: 1, kind: 'away', name: 'Bia' }],
    onResume,
    ...room,
  };
  render(<Table session={session} room={full} onExit={onExit} onPlayAgain={() => undefined} />);
  return { session, onResume, onExit };
}

describe('mesa em sala online', () => {
  it('mostra o código, o "(bot)" de quem está coberto, a foto e o aviso', () => {
    const { session } = renderTable();
    expect(screen.getByText('ABC234')).toBeInTheDocument();
    expect(screen.getByText('bot')).toBeInTheDocument();
    expect(screen.getByText('Bia saiu da partida. Um bot assumiu o lugar.')).toBeInTheDocument();
    expect(
      document.querySelector('img[src="https://lh3.googleusercontent.com/a/bia"]'),
    ).not.toBeNull();
    session.dispose();
  });

  it('parado demais: faixa com "Voltar a jogar"', () => {
    const { session, onResume } = renderTable({ myCover: 'idle' });
    fireEvent.click(screen.getByRole('button', { name: 'Voltar a jogar' }));
    expect(onResume).toHaveBeenCalledOnce();
    session.dispose();
  });

  it('convidado: sair avisa que um bot assume e que dá para voltar', () => {
    const { session } = renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Sair da partida' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/Um bot assume o seu lugar/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/fica salva/)).toBeNull();
    session.dispose();
  });

  it('anfitrião: sair avisa que a partida será encerrada', () => {
    const { session, onExit } = renderTable({ isHost: true });
    fireEvent.click(screen.getByRole('button', { name: 'Sair da partida' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/a partida é encerrada para todos/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Encerrar e sair' }));
    expect(onExit).toHaveBeenCalledOnce();
    session.dispose();
  });
});
