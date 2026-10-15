/**
 * Pedra em camadas (spec 11.2): corpo (compartilhado), face (tema), verso (tema) e camada de ajudas
 * (independente do tema). Tamanho por `width` em px do palco; a altura segue a proporção da pedra.
 */
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { numberOf, suitOf, type Tile as TileData } from '../../engine';
import { useTileHighlight } from './tileHighlight';
import { labelText, useTileLabels } from './tileLabels';
import { tileName } from './tileName';
import { t } from '../../i18n';
import styles from './Tile.module.css';
import { HONOR_GLYPHS, MAN_CHAR, MAN_NUMERALS, PIN_DOTS, SOU_BARS } from './tileFaces';

function Face({ tile }: { tile: TileData }): ReactNode {
  const suit = suitOf(tile.kind);
  const n = numberOf(tile.kind);
  const red = tile.red;
  if (suit === 'm') {
    return (
      <span className={styles.man}>
        <span className={red ? styles.redInk : styles.darkInk}>{MAN_NUMERALS[n - 1]}</span>
        <span className={styles.redInk}>{MAN_CHAR}</span>
      </span>
    );
  }
  if (suit === 'p') {
    return (
      <span className={styles.dots}>
        {(PIN_DOTS[n] ?? []).map((d, i) => (
          <span
            key={i}
            className={`${styles.dot} ${styles[`ink_${red ? 'r' : d.c}`]} ${n === 1 ? styles.bigDot : ''}`}
            style={{ left: `${d.x}%`, top: `${d.y}%`, '--s': d.s ?? 1 } as CSSProperties}
          />
        ))}
      </span>
    );
  }
  if (suit === 's') {
    if (n === 1) {
      return (
        <span className={styles.dots}>
          <span className={`${styles.bird} ${red ? styles.ink_r : styles.ink_g}`} />
        </span>
      );
    }
    return (
      <span className={styles.dots}>
        {(SOU_BARS[n] ?? []).map((b, i) => (
          <span
            key={i}
            className={`${styles.bar} ${styles[`ink_${red ? 'r' : b.c}`]}`}
            style={
              { left: `${b.x}%`, top: `${b.y}%`, '--rot': `${b.rot ?? 0}deg` } as CSSProperties
            }
          />
        ))}
      </span>
    );
  }
  if (n === 5) return <span className={styles.haku} />;
  const ink = n === 6 ? styles.greenInk : n === 7 ? styles.redInk : styles.darkInk;
  return <span className={`${styles.honor} ${ink}`}>{HONOR_GLYPHS[n - 1]}</span>;
}

export interface TileProps {
  /** null = peça virada (verso). */
  readonly tile: TileData | null;
  readonly width?: number;
  /** Deitada (peça chamada ou de riichi). */
  readonly sideways?: boolean;
  readonly selected?: boolean;
  readonly dimmed?: boolean;
  /** Realce da camada de ajudas. */
  readonly glow?: boolean;
  readonly onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  readonly onPointerEnter?: () => void;
  readonly onPointerLeave?: () => void;
  readonly className?: string;
  readonly tabIndex?: number;
}

export function Tile({
  tile,
  width = 48,
  sideways = false,
  selected = false,
  dimmed = false,
  glow = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
  className = '',
  tabIndex,
}: TileProps) {
  const hl = useTileHighlight();
  // Camada de ajudas: bônus (dora/vermelha) brilha; cópias da peça sob o mouse brilham na mesa.
  const bonus = !!tile && !!hl?.bonusGlow && (tile.red || hl.bonusKinds.has(tile.kind));
  const match = !!tile && !onClick && hl?.matchKind === tile.kind;
  const classes = [
    styles.tile,
    tile ? styles.front : styles.back,
    sideways ? styles.sideways : '',
    selected ? styles.selected : '',
    dimmed ? styles.dimmed : '',
    glow ? styles.glow : '',
    tile?.red ? styles.redTile : '',
    bonus ? (tile?.red ? styles.bonusRed : styles.bonus) : '',
    match ? styles.match : '',
    onClick ? styles.clickable : '',
    className,
  ].join(' ');
  const style = { '--tw': `${width}px` } as CSSProperties;
  const ariaLabel = tile ? tileName(tile) : t('tile.back');
  const labels = useTileLabels();
  const label = tile && labels ? labelText(tile.kind, labels) : null;
  const content = (
    <span className={styles.body}>
      <span className={styles.face}>{tile ? <Face tile={tile} /> : null}</span>
      {bonus && (
        <span
          className={styles.sheen}
          aria-hidden="true"
          style={{ animationDelay: `${-((tile?.id ?? 0) % 7) * 0.8}s` }}
        />
      )}
      {label && (
        <span className={styles.label} aria-hidden="true">
          {label}
        </span>
      )}
    </span>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        style={style}
        aria-label={ariaLabel}
        aria-pressed={selected}
        data-tile=""
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        tabIndex={tabIndex}
      >
        {content}
      </button>
    );
  }
  return (
    <span
      className={classes}
      style={style}
      role="img"
      aria-label={ariaLabel}
      data-tile=""
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {content}
    </span>
  );
}
