/** Resultado da mão (yaku, han/fu, pagamentos) e resultado final da partida (só ranking, spec 7.12). */
import {
  compareTiles,
  type HandSummary,
  type MatchResult,
  type Seat,
  type WinRecord,
} from '../../engine';
import { t } from '../../i18n';
import type { SeatSetup } from '../../session';
import { Tile } from '../components/Tile';
import { seatName } from './labels';
import styles from './Summary.module.css';

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function WinBlock({ win, seats }: { win: WinRecord; seats: readonly SeatSetup[] }) {
  const s = win.scored;
  const hand = win.hand.filter((x) => x.id !== win.winTile.id).sort(compareTiles);
  const total = win.deltas[win.seat] ?? 0;
  return (
    <section className={styles.win}>
      <h3 className={styles.winTitle}>
        {t('summary.winner', { name: seatName(seats, win.seat) })} —{' '}
        {t(win.winType === 'ron' ? 'summary.ron' : 'summary.tsumo')}
        {win.from !== null && (
          <span className={styles.muted}>
            {' '}
            {t('summary.from', { name: seatName(seats, win.from) })}
          </span>
        )}
      </h3>
      <div className={styles.handRow}>
        {hand.map((tile) => (
          <Tile key={tile.id} tile={tile} width={44} />
        ))}
        <span className={styles.gap} />
        <Tile tile={win.winTile} width={44} glow />
        {win.melds.map((m, i) => (
          <span key={i} className={styles.meldGroup}>
            {m.tiles.map((tile, j) => (
              <Tile
                key={tile.id}
                tile={m.type === 'ankan' && (j === 0 || j === 3) ? null : tile}
                width={36}
              />
            ))}
          </span>
        ))}
      </div>
      <ul className={styles.yakuList}>
        {s.yakuman.map((y) => (
          <li key={y.id}>
            <span>{t(`yaku.${y.id}.name`)}</span>
            <span>
              {y.value > 1 ? t('summary.yakumanMulti', { n: y.value }) : t('summary.yakuman')}
            </span>
          </li>
        ))}
        {s.yaku.map((y) => (
          <li key={y.id} title={t(`yaku.${y.id}.desc`)}>
            <span>{t(`yaku.${y.id}.name`)}</span>
            <span>{t('summary.han', { n: y.value })}</span>
          </li>
        ))}
        {s.dora > 0 && (
          <li>
            <span>{t('summary.dora')}</span>
            <span>{t('summary.han', { n: s.dora })}</span>
          </li>
        )}
        {s.aka > 0 && (
          <li>
            <span>{t('summary.aka')}</span>
            <span>{t('summary.han', { n: s.aka })}</span>
          </li>
        )}
        {s.ura > 0 && (
          <li>
            <span>{t('summary.ura')}</span>
            <span>{t('summary.han', { n: s.ura })}</span>
          </li>
        )}
        {s.kita > 0 && (
          <li>
            <span>{t('summary.kita')}</span>
            <span>{t('summary.han', { n: s.kita })}</span>
          </li>
        )}
      </ul>
      <p className={styles.score}>
        {s.yakumanMultiplier > 0
          ? s.kazoe
            ? t('summary.kazoe')
            : t('summary.limit.yakuman')
          : `${t('summary.han', { n: s.han })} ${t('summary.fu', { n: s.fu })}${s.limit !== 'none' ? ` · ${t(`summary.limit.${s.limit}`)}` : ''}`}
        <strong> {t('summary.points', { n: signed(total) })}</strong>
      </p>
      {win.pao !== null && (
        <p className={styles.muted}>{t('summary.pao', { name: seatName(seats, win.pao) })}</p>
      )}
    </section>
  );
}

export function HandSummaryDialog({
  summary,
  seats,
  canContinue,
  onContinue,
}: {
  summary: HandSummary;
  seats: readonly SeatSetup[];
  canContinue: boolean;
  onContinue: () => void;
}) {
  const title =
    summary.kind === 'win'
      ? null
      : summary.kind === 'exhaustive'
        ? t('summary.exhaustive')
        : `${t('summary.abortive')}: ${t(`summary.abortive.${summary.abortiveReason ?? 'kyuushuKyuuhai'}`)}`;
  return (
    <div className={styles.backdrop}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? t('summary.ron')}
      >
        {title && <h2 className={styles.title}>{title}</h2>}
        {summary.wins.map((w) => (
          <WinBlock key={w.seat} win={w} seats={seats} />
        ))}
        {summary.uraIndicators.length > 0 && (
          <div className={styles.indicators}>
            <span>{t('summary.uraIndicators')}</span>
            {summary.uraIndicators.map((x) => (
              <Tile key={x.id} tile={x} width={36} />
            ))}
          </div>
        )}
        {summary.nagashi.length > 0 && (
          <p className={styles.note}>
            {t('summary.nagashi')}: {summary.nagashi.map((s) => seatName(seats, s)).join(', ')}
          </p>
        )}
        {summary.tenpai && (
          <ul className={styles.tenpaiList}>
            {summary.tenpai.map((isTenpai, seat) => (
              <li key={seat}>
                <span>{seatName(seats, seat as Seat)}</span>
                <span className={isTenpai ? styles.tenpai : styles.muted}>
                  {t(isTenpai ? 'summary.tenpai' : 'summary.noten')}
                </span>
                {isTenpai && (
                  <span className={styles.handRow}>
                    {[...(summary.revealed[seat as Seat] ?? [])].sort(compareTiles).map((tile) => (
                      <Tile key={tile.id} tile={tile} width={30} />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <table className={styles.deltas}>
          <tbody>
            {summary.scoresAfter.map((after, seat) => {
              const d = summary.deltas[seat] ?? 0;
              return (
                <tr key={seat}>
                  <td>{seatName(seats, seat as Seat)}</td>
                  <td>{summary.scoresBefore[seat]}</td>
                  <td className={d > 0 ? styles.plus : d < 0 ? styles.minus : styles.muted}>
                    {signed(d)}
                  </td>
                  <td>
                    <strong>{after}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          className={styles.primary}
          disabled={!canContinue}
          onClick={onContinue}
          autoFocus
        >
          {t('summary.continue')}
        </button>
      </div>
    </div>
  );
}

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
        <h2 id="result-title" className={styles.title}>
          {t('result.title')}
        </h2>
        <p className={styles.muted}>{t(`result.endReason.${result.endReason}`)}</p>
        <ol className={styles.ranking}>
          {result.ranking.map((seat, place) => (
            <li key={seat} className={place === 0 ? styles.first : undefined}>
              <span className={styles.place}>{t('result.place', { n: place + 1 })}</span>
              <span>{seatName(seats, seat)}</span>
              <strong>{result.finalScores[seat]}</strong>
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
