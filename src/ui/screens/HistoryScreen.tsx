/**
 * /historico (spec 12.4): últimas partidas com filtros por modo e duração e estatísticas simples
 * (colocação média, % de 1º lugar, maior mão, yaku mais frequentes). Treino fica fora das contas.
 */
import { useEffect, useMemo, useState } from 'react';
import { t, tKey } from '../../i18n';
import { historyStats, type MatchSummary } from '../../session';
import { loadHistory, useAccount } from '../../state/account';
import { BackLink } from '../components/BackLink';
import page from './Page.module.css';
import { GoogleButton } from './ProfileScreen';
import styles from './HistoryScreen.module.css';

const PLACE_GLYPH = ['一', '二', '三', '四'];

type ModeFilter = 'all' | 'yonma' | 'sanma';
type LengthFilter = 'all' | 'oneHand' | 'east' | 'south';

const yakuName = (id: string) => tKey(`yaku.${id}.name`);

function Filter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.filter} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? styles.chipOn : styles.chip}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function HistoryScreen() {
  const status = useAccount((s) => s.status);
  const [list, setList] = useState<MatchSummary[] | null>(null);
  const [mode, setMode] = useState<ModeFilter>('all');
  const [length, setLength] = useState<LengthFilter>('all');

  useEffect(() => {
    if (status !== 'signedIn') return;
    let alive = true;
    void loadHistory().then((l) => {
      if (alive) setList(l);
    });
    return () => {
      alive = false;
    };
  }, [status]);

  const filtered = useMemo(
    () =>
      (list ?? []).filter(
        (m) => (mode === 'all' || m.mode === mode) && (length === 'all' || m.length === length),
      ),
    [list, mode, length],
  );
  const stats = useMemo(() => historyStats(filtered), [filtered]);

  return (
    <main className={page.page}>
      <header className={page.header}>
        <BackLink to="/perfil" label={t('account.title')} />
        <h1 className={page.title}>{t('history.title')}</h1>
      </header>

      {status === 'guest' ? (
        <section className={page.section}>
          <p className={page.lead}>{t('history.needLogin')}</p>
          <GoogleButton />
        </section>
      ) : status === 'loading' || list === null ? (
        <p className={page.lead} role="status">
          {t('account.loading')}
        </p>
      ) : (
        <>
          <div className={styles.filters}>
            <Filter<ModeFilter>
              label={t('setup.mode')}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'all', label: t('history.all') },
                { value: 'yonma', label: t('setup.mode.yonma') },
                { value: 'sanma', label: t('setup.mode.sanma') },
              ]}
            />
            <Filter<LengthFilter>
              label={t('rules.length.label')}
              value={length}
              onChange={setLength}
              options={[
                { value: 'all', label: t('history.all') },
                { value: 'oneHand', label: t('rules.length.oneHand') },
                { value: 'east', label: t('rules.length.east') },
                { value: 'south', label: t('rules.length.south') },
              ]}
            />
          </div>

          <section className={styles.stats} aria-label={t('history.stats')}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.games}</span>
              <span className={styles.statLabel}>{t('history.games')}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {stats.averagePlacement === null
                  ? '—'
                  : stats.averagePlacement.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
              </span>
              <span className={styles.statLabel}>{t('history.avgPlace')}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {stats.firstRate === null ? '—' : `${Math.round(stats.firstRate * 100)}%`}
              </span>
              <span className={styles.statLabel}>{t('history.firstRate')}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {stats.biggestWin ? stats.biggestWin.points.toLocaleString('pt-BR') : '—'}
              </span>
              <span className={styles.statLabel}>
                {t('history.biggest')}
                {stats.biggestWin && (
                  <small>
                    {' '}
                    · {stats.biggestWin.han} han · {stats.biggestWin.fu} fu
                  </small>
                )}
              </span>
            </div>
          </section>

          {stats.topYaku.length > 0 && (
            <section className={page.section}>
              <h2>{t('history.topYaku')}</h2>
              <ul className={styles.yakuList}>
                {stats.topYaku.map((y) => (
                  <li key={y.id}>
                    <strong>{yakuName(y.id)}</strong> ×{y.count}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filtered.length === 0 ? (
            <p className={page.lead}>{t('history.empty')}</p>
          ) : (
            <ol className={styles.matches}>
              {filtered.map((m) => (
                <li key={m.id} className={styles.match}>
                  <span className={`${styles.place} ${m.placement === 1 ? styles.first : ''}`}>
                    {PLACE_GLYPH[m.placement - 1] ?? m.placement}
                  </span>
                  <div className={styles.matchInfo}>
                    <strong>
                      {t(`setup.mode.${m.mode}`)} · {tKey(`rules.length.${m.length}`)}
                      {m.source === 'room' && ` · ${t('history.room')}`}
                      {m.training && ` · ${t('table.training')}`}
                    </strong>
                    <span className={page.desc}>
                      {new Date(m.endedAt).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {' · '}
                      {m.wins.length === 0
                        ? t('history.noWins')
                        : t('history.wins', { n: m.wins.length })}
                    </span>
                  </div>
                  <span className={styles.points}>{m.finalPoints.toLocaleString('pt-BR')}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </main>
  );
}
