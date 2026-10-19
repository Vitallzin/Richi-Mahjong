// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NO_ACTIONS, parseTiles } from '../../engine';
import { ActionBar } from '../table/ActionBar';
import { availableActions } from '../table/actions';
import { ConfirmDialog } from './ConfirmDialog';
import { DecisionDialog } from './DecisionDialog';
import { Tile } from './Tile';
import { TileHighlightContext } from './tileHighlight';

describe('Tile', () => {
  it('tem rótulo em português para leitor de tela', () => {
    const [five] = parseTiles('0s');
    const [east] = parseTiles('1z');
    const [three] = parseTiles('3m');
    render(
      <>
        <Tile tile={five!} />
        <Tile tile={east!} />
        <Tile tile={three!} />
        <Tile tile={null} />
      </>,
    );
    expect(screen.getByRole('img', { name: '5 de bambu, vermelho' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Leste' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3 de caractere' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Peça virada' })).toBeInTheDocument();
  });

  it('vira botão quando clicável', () => {
    const [tile] = parseTiles('7z');
    const onClick = vi.fn();
    render(<Tile tile={tile!} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dragão Vermelho' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('ActionBar', () => {
  it('mostra só as jogadas disponíveis, com texto, e sempre "Passar" quando há chamada', () => {
    const [a, b] = parseTiles('55p');
    const legal = { ...NO_ACTIONS, ron: true, pon: [[a!, b!] as const], pass: true };
    const actions = availableActions(legal);
    expect(actions).toEqual(['ron', 'pon', 'pass']);
    const onAction = vi.fn();
    render(<ActionBar actions={actions} onAction={onAction} />);
    const bar = screen.getByRole('toolbar');
    expect(
      within(bar)
        .getAllByRole('button')
        .map((x) => x.textContent),
    ).toEqual(['荣Ron', '碰Pon', '过Passar']);
    fireEvent.click(screen.getByRole('button', { name: /Passar/ }));
    expect(onAction).toHaveBeenCalledWith('pass');
  });

  it('sem jogadas, não aparece', () => {
    const { container } = render(<ActionBar actions={[]} onAction={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DecisionDialog', () => {
  it('lista as variantes com as peças e permite cancelar', () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    render(
      <DecisionDialog
        title="Escolha a sequência para o chi"
        options={[
          { key: 'a', tiles: parseTiles('345m') },
          { key: 'b', tiles: parseTiles('3m4m0m') },
        ]}
        onPick={onPick}
        onCancel={onCancel}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Escolha a sequência para o chi' });
    const options = within(dialog).getAllByRole('button').slice(0, 2);
    expect(
      within(options[1]!).getByRole('img', { name: '5 de caractere, vermelho' }),
    ).toBeInTheDocument();
    fireEvent.click(options[1]!);
    expect(onPick).toHaveBeenCalledWith('b');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

describe('destaques da camada de ajudas', () => {
  it('dora e vermelhas ganham brilho; cópias da peça sob o mouse ganham destaque', () => {
    const [oneM, red5p, chun] = parseTiles('1m0p7z');
    const { container } = render(
      <TileHighlightContext.Provider
        value={{ bonusGlow: true, bonusKinds: new Set([0]), matchKind: 33 }}
      >
        <Tile tile={oneM!} />
        <Tile tile={red5p!} />
        <Tile tile={chun!} />
        <Tile tile={chun!} onClick={() => undefined} />
      </TileHighlightContext.Provider>,
    );
    const tiles = container.querySelectorAll('[data-tile]');
    expect(tiles[0]?.className).toMatch(/bonus/);
    expect(tiles[1]?.className).toMatch(/bonusRed/);
    expect(tiles[2]?.className).toMatch(/match/);
    // a peça clicável (da própria mão) não se destaca a si mesma
    expect(tiles[3]?.className).not.toMatch(/match/);
  });

  it('com a ajuda desligada, nada brilha', () => {
    const [oneM] = parseTiles('1m');
    const { container } = render(
      <TileHighlightContext.Provider
        value={{ bonusGlow: false, bonusKinds: new Set([0]), matchKind: null }}
      >
        <Tile tile={oneM!} />
      </TileHighlightContext.Provider>,
    );
    expect(container.querySelector('[data-tile]')?.className).not.toMatch(/bonus/);
  });
});

describe('ConfirmDialog', () => {
  it('foca o botão seguro, confirma no clique e cancela com Esc', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        glyph="退"
        title="Sair da partida?"
        message="A partida fica salva."
        confirmLabel="Sair"
        cancelLabel="Continuar jogando"
        danger
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const dialog = screen.getByRole('alertdialog', { name: 'Sair da partida?' });
    expect(screen.getByRole('button', { name: 'Continuar jogando' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
