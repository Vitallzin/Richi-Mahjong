/**
 * Painel do guia na mesa (spec 9.2 e 9.3). Usa só a PlayerView, via src/help. Mostra a situação da
 * mão — ou da mão que sobraria descartando a peça em foco — sem nunca sugerir descarte (spec 9.6).
 */
import { useMemo } from 'react';
import type { PlayerView, Tile as TileData } from '../../engine';
import { analyzeHand, type HelpPrefs, type WaitInfo } from '../../help';
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
}: {
  view: PlayerView;
  focus: TileData | null;
  prefs: HelpPrefs;
}) {
  const advice = useMemo(() => analyzeHand(view, focus), [view, focus]);
  const anyHelp = prefs.rules || prefs.waits || prefs.noYaku || prefs.furiten;
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

  return (
    <aside className={styles.helpPanel} aria-label={t('help.panel')} aria-live="polite">
      <h2 className={styles.helpTitle}>{t('help.panel')}</h2>
      {focus && (
        <p className={styles.helpFocus}>
          {t('help.afterDiscard')} <Tile tile={focus} width={26} />
        </p>
      )}
      {stateText && <p className={styles.helpState}>{stateText}</p>}
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
