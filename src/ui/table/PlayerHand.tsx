/**
 * Mão do jogador (sem perspectiva, spec 10.2). Mouse: passar por cima levanta, clique descarta.
 * Toque: 1º toque seleciona, 2º descarta (spec 10.3). Teclado: ←/→ escolhe, Enter descarta.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { compareTiles, type Tile as TileData } from '../../engine';
import { Tile } from '../components/Tile';
import styles from './Table.module.css';

export const HAND_TILE = 70;

interface Props {
  readonly hand: readonly TileData[];
  readonly drawn: TileData | null;
  /** Ids que podem ser descartados agora (vazio = não é a vez). */
  readonly discardable: ReadonlySet<number>;
  /** Escala de acessibilidade das peças (spec 10.7). */
  readonly scale?: number;
  readonly onDiscard: (tile: TileData) => void;
  /** Peça em foco (mouse por cima, seleção por toque ou teclado), para a análise do guia. */
  readonly onFocusTile?: (tile: TileData | null) => void;
  /** Peça sob o mouse (ou tocada), em qualquer momento — destaca as cópias visíveis na mesa. */
  readonly onHoverTile?: (tile: TileData | null) => void;
  /** Mão recém-distribuída: as pedras chegam uma a uma (animação ao montar). */
  readonly dealing?: boolean;
}

export function PlayerHand({
  hand,
  drawn,
  discardable,
  scale = 1,
  onDiscard,
  onFocusTile,
  onHoverTile,
  dealing = false,
}: Props) {
  const [rawSelected, setSelected] = useState<number | null>(null);
  const pointerType = useRef<string>('mouse');
  const myTurn = discardable.size > 0;

  const rest = hand.filter((t) => t.id !== drawn?.id);
  // A mão é sempre organizada (pedido do desenvolvedor); a peça comprada fica à parte.
  const ordered = [...rest].sort(compareTiles);
  const tiles = drawn ? [...ordered, drawn] : ordered;

  // Fora da vez, nada fica selecionado (derivado, sem efeito).
  const selected = myTurn ? rawSelected : null;

  const activate = (tile: TileData) => {
    if (!discardable.has(tile.id)) return;
    if (pointerType.current === 'mouse' || selected === tile.id) {
      setSelected(null);
      onDiscard(tile);
    } else {
      setSelected(tile.id);
      onFocusTile?.(tile);
      onHoverTile?.(tile);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!myTurn) return;
    const playable = tiles.filter((x) => discardable.has(x.id));
    if (playable.length === 0) return;
    const index = playable.findIndex((x) => x.id === selected);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = playable[(index + delta + playable.length) % playable.length] ?? playable[0];
      setSelected(next?.id ?? null);
      onFocusTile?.(next ?? null);
    } else if ((e.key === 'Enter' || e.key === ' ') && index >= 0) {
      e.preventDefault();
      const tile = playable[index];
      if (tile) {
        setSelected(null);
        onDiscard(tile);
      }
    }
  };

  return (
    <div
      className={`${styles.hand} ${dealing ? styles.dealing : ''}`}
      data-hover-zone="hand"
      onKeyDown={onKeyDown}
      onPointerDown={(e: PointerEvent) => {
        pointerType.current = e.pointerType;
      }}
      onPointerLeave={(e: PointerEvent) => {
        if (e.pointerType === 'mouse') {
          onFocusTile?.(null);
          onHoverTile?.(null);
        }
      }}
    >
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          width={Math.round(HAND_TILE * scale)}
          className={`${drawn && tile.id === drawn.id ? styles.drawnTile : ''} ${myTurn && discardable.has(tile.id) ? styles.playable : ''}`}
          selected={selected === tile.id}
          dimmed={myTurn && !discardable.has(tile.id)}
          onClick={myTurn ? () => activate(tile) : undefined}
          tabIndex={myTurn ? 0 : -1}
          onPointerEnter={() => {
            onHoverTile?.(tile);
            if (myTurn && discardable.has(tile.id)) onFocusTile?.(tile);
          }}
        />
      ))}
    </div>
  );
}
