/** Resultado final da partida: só o ranking (spec 7.12), com selos de colocação. */
import type { CSSProperties } from 'react';
import type { MatchResult } from '../../engine';
import { t } from '../../i18n';
import type { SeatSetup } from '../../session';
import { seatName } from './labels';
import styles from './Summary.module.css';

const PLACE_GLYPH = ['一', '二', '三', '四'] as const;

export function MatchResultDialog({
  result,
  seats,
  onPlayAgain,
  onMenu,
}: {
  result: MatchResult;
  seats: readonly SeatSetup[];
  onPlayAgain: () => void;
  onMenu: () => void;
}) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="result-title">
        <span className={styles.watermark} aria-hidden="true">
          終局
        </span>
        <h2 id="result-title" className={styles.title}>
          {t('result.title')}
        </h2>
        <p className={styles.muted}>{t(`result.endReason.${result.endReason}`)}</p>
        <ol className={styles.ranking}>
          {result.ranking.map((seat, place) => (
            <li
              key={seat}
              className={place === 0 ? styles.first : undefined}
              style={{ '--d': `${300 + (result.ranking.length - place) * 260}ms` } as CSSProperties}
            >
              <span className={styles.place} aria-label={t('result.place', { n: place + 1 })}>
                {PLACE_GLYPH[place]}
              </span>
              <span className={styles.name}>{seatName(seats, seat)}</span>
              <strong className={styles.score}>
                {(result.finalScores[seat] ?? 0).toLocaleString('pt-BR')}
              </strong>
            </li>
          ))}
        </ol>
        <div className={styles.buttons}>
          <button type="button" className={styles.primary} onClick={onPlayAgain} autoFocus>
            {t('result.playAgain')}
          </button>
          <button type="button" className={styles.secondary} onClick={onMenu}>
            {t('result.menu')}
          </button>
        </div>
      </div>
    </div>
  );
}
