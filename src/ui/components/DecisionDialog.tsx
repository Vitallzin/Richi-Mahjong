/**
 * Janela única de decisão (spec 10.5): variantes de chi/pon (com e sem vermelha), descarte do riichi,
 * kan com várias possibilidades e confirmação do kyuushu kyuuhai. Mostra as peças e tem Cancelar.
 */
import { useEffect, useRef } from 'react';
import type { Tile as TileData } from '../../engine';
import { t } from '../../i18n';
import styles from './DecisionDialog.module.css';
import { Tile } from './Tile';

export interface DecisionOption {
  readonly key: string;
  readonly tiles: readonly TileData[];
  readonly label?: string;
}

export interface DecisionDialogProps {
  readonly title: string;
  readonly description?: string;
  readonly options: readonly DecisionOption[];
  readonly onPick: (key: string) => void;
  readonly onCancel: () => void;
}

export function DecisionDialog({
  title,
  description,
  options,
  onPick,
  onCancel,
}: DecisionDialogProps) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      >
        <h2 id="decision-title" className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
        <div className={styles.options}>
          {options.map((o, i) => (
            <button
              key={o.key}
              ref={i === 0 ? first : undefined}
              type="button"
              className={styles.option}
              onClick={() => onPick(o.key)}
            >
              <span className={styles.tiles}>
                {o.tiles.map((tile) => (
                  <Tile key={tile.id} tile={tile} width={52} />
                ))}
              </span>
              {o.label && <span className={styles.label}>{o.label}</span>}
            </button>
          ))}
        </div>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          {t('action.cancel')}
        </button>
      </div>
    </div>
  );
}
