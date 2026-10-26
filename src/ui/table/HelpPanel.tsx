/**
 * Painel do guia na mesa (spec 9.2 e 9.3). Usa só a PlayerView, via src/help. Mostra a situação da
 * mão — ou da mão que sobraria descartando a peça em foco — sem nunca sugerir descarte (spec 9.6).
 */
import { useMemo } from 'react';
import type { PlayerView, Tile as TileData } from '../../engine';
import { analyzeHand, yakuPath, type HelpPrefs, type WaitInfo } from '../../help';
import { t } from '../../i18n';
import { Tile } from '../components/Tile';
import styles from './Table.module.css';

const yakuNames = (ids: readonly string[]) =>
  ids.map((id) => t(`yaku.${id}.name` as Parameters<typeof t>[0])).join(', ');

function yakuLine(w: WaitInfo): { text: string; tone: 'ok' | 'warn' | 'bad' } {
  if (w.ron.ok && w.tsumo.ok) return { text: t('help.yaku.both'), tone: 'ok' };
  if (!w.ron.ok && w.tsumo.ok) {
    const extra = w.tsumo.yaku.filter((y) => !w.ron.yaku.includes(y));
    return {
      text: t('help.yaku.tsumoOnly', { yaku: yakuNames(extra.length > 0 ? extra : w.tsumo.yaku) }),
      tone: 'warn',
    };
  }
  if (w.ron.ok) return { text: t('help.yaku.ronOnly'), tone: 'ok' };
  if (w.riichiWouldGiveYaku) return { text: t('help.yaku.riichi'), tone: 'warn' };
  if (w.ron.belowMinimum || w.tsumo.belowMinimum)
    return { text: t('help.yaku.belowMin'), tone: 'bad' };
  return { text: t('help.yaku.none'), tone: 'bad' };
}

const notVisibleText = (n: number) =>
  n === 0 ? t('help.notVisible0') : n === 1 ? t('help.notVisible1') : t('help.notVisible', { n });

export function HelpPanel({
  view,
  focus,
  prefs,
  collapsed = false,
  onToggle,
}: {
  view: PlayerView;
  focus: TileData | null;
  prefs: HelpPrefs;
  /** Recolhido: só uma aba na borda direita com a frase principal. */
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const advice = useMemo(() => analyzeHand(view, focus), [view, focus]);
  const path = useMemo(() => yakuPath(view, advice, focus), [view, advice, focus]);
  const anyHelp = prefs.rules || prefs.waits || prefs.noYaku || prefs.furiten || prefs.yakuPath;
  if (!anyHelp || view.hand.length === 0) return null;

  let stateText: string | null = null;
  if (prefs.rules) {
    if (advice.state === 'complete') {
      const c = advice.completeWithYaku;
      stateText = !c
        ? t('help.state.complete')
        : c.ok
          ? t('help.state.completeYaku')
          : c.belowMinimum
            ? t('help.state.completeBelowMin')
            : t('help.state.completeNoYaku');
    } else if (advice.state === 'discardToTenpai') {
      stateText = t('help.state.discardToTenpai');
    } else if (advice.state === 'tenpai') {
      stateText = t('help.state.tenpai');
    } else if (advice.shanten === 0) {
      stateText = t('help.state.noWaits');
    } else {
      stateText =
        advice.shanten === 1
          ? t('help.state.shanten1')
          : t('help.state.shanten', { n: advice.shanten });
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className={styles.helpTab}
        aria-expanded="false"
        aria-label={`${t('help.expand')}${stateText ? `: ${stateText}` : ''}`}
        onClick={onToggle}
      >
        <span className={styles.helpTabTitle} aria-hidden="true">
          ◂ {t('help.panel')}
        </span>
        {stateText && (
          <span className={styles.helpTabState} aria-hidden="true">
            {stateText}
          </span>
        )}
      </button>
    );
  }

  return (
    <aside className={styles.helpPanel} aria-label={t('help.panel')} aria-live="polite">
      <div className={styles.helpHeader}>
        <h2 className={styles.helpTitle}>{t('help.panel')}</h2>
        {onToggle && (
          <button
            type="button"
            className={styles.helpCollapse}
            aria-expanded="true"
            onClick={onToggle}
          >
            {t('help.collapse')} ▸
          </button>
        )}
      </div>
      {focus && (
        <p className={styles.helpFocus}>
          {t('help.afterDiscard')} <Tile tile={focus} width={26} />
        </p>
      )}
      {stateText && <p className={styles.helpState}>{stateText}</p>}
      {prefs.yakuPath && advice.state !== 'complete' && path.yaku.length > 0 && (
        <div className={styles.helpPath}>
          <span className={styles.helpPathTitle}>
            {t('help.path.title')}{' '}
            <small>
              ({path.source === 'waits' ? t('help.path.sure') : t('help.path.estimate')})
            </small>
          </span>
          <ul className={styles.helpPathList}>
            {path.yaku.map((id) => (
              <li key={id}>
                <strong>{t(`yaku.${id}.name` as Parameters<typeof t>[0])}</strong>
                <span>{t(`yaku.${id}.desc` as Parameters<typeof t>[0])}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {prefs.yakuPath && path.openWithoutYaku && advice.state !== 'complete' && (
        <p className={styles.tone_bad}>{t('help.path.openNone')}</p>
      )}
      {prefs.waits && advice.waits.length > 0 && (
        <ul className={styles.helpWaits}>
          {advice.waits.map((w) => {
            const line = prefs.noYaku ? yakuLine(w) : null;
            return (
              <li key={w.kind}>
                <Tile
                  tile={{ id: -100 - w.kind, kind: w.kind, red: false }}
                  width={30}
                  dimmed={w.notVisible === 0}
                />
                <span className={styles.helpWaitText}>
                  <span>{notVisibleText(w.notVisible)}</span>
                  {line && <span className={styles[`tone_${line.tone}`]}>{line.text}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {prefs.furiten && advice.furiten && advice.state === 'tenpai' && (
        <p className={styles.tone_bad}>{t('help.furiten')}</p>
      )}
      {prefs.waits && advice.state === 'tenpai' && (
        <p className={advice.realWinPossible ? styles.tone_ok : styles.tone_bad}>
          {advice.realWinPossible ? t('help.realWin') : t('help.noRealWin')}
        </p>
      )}
      {prefs.rules && advice.state === 'notTenpai' && advice.shanten >= 3 && (
        <p className={styles.helpHint}>{t('help.structure')}</p>
      )}
    </aside>
  );
}
