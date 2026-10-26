/** /configuracoes: som, idioma, acessibilidade e dados salvos (spec 10.1 e 10.7). */
import { useState } from 'react';
import { t } from '../../i18n';
import { abandonSavedMatch } from '../../state/match';
import { useSettings } from '../../state/settings';
import { BackLink } from '../components/BackLink';
import { ConfirmDialog } from '../components/ConfirmDialog';
import styles from './Page.module.css';

export function SettingsScreen() {
  const s = useSettings();
  const [notice, setNotice] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const a11y = s.accessibility;
  const scales = [
    { value: 1, label: t('settings.tileScale.normal') },
    { value: 1.1, label: t('settings.tileScale.large') },
    { value: 1.2, label: t('settings.tileScale.xlarge') },
  ] as const;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <BackLink />
        <h1 className={styles.title}>{t('settings.title')}</h1>
      </header>

      <section className={styles.section}>
        <h2>{t('settings.sound')}</h2>
        <label className={styles.row}>
          {t('settings.volume')}
          <input
            className={styles.range}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            onChange={(e) => s.set({ volume: Number(e.target.value) })}
          />
        </label>
        <label className={styles.row}>
          {t('settings.mute')}
          <input
            type="checkbox"
            checked={s.muted}
            onChange={(e) => s.set({ muted: e.target.checked })}
          />
        </label>
        <label className={styles.row}>
          <span>
            {t('settings.music')}
            <br />
            <span className={styles.desc}>{t('settings.music.desc')}</span>
          </span>
          <input
            type="checkbox"
            checked={s.music}
            onChange={(e) => s.set({ music: e.target.checked })}
          />
        </label>
        <label className={styles.row}>
          {t('settings.musicVolume')}
          <input
            className={styles.range}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.musicVolume}
            disabled={!s.music}
            onChange={(e) => s.set({ musicVolume: Number(e.target.value) })}
          />
        </label>
        <label className={styles.row}>
          <span>
            {t('settings.hoverSounds')}
            <br />
            <span className={styles.desc}>{t('settings.hoverSounds.desc')}</span>
          </span>
          <input
            type="checkbox"
            checked={s.hoverSounds}
            onChange={(e) => s.set({ hoverSounds: e.target.checked })}
          />
        </label>
      </section>

      <section className={styles.section}>
        <h2>{t('settings.a11y')}</h2>
        <label className={styles.row}>
          <span>
            {t('settings.reduceMotion')}
            <br />
            <span className={styles.desc}>{t('settings.reduceMotion.desc')}</span>
          </span>
          <input
            type="checkbox"
            checked={a11y.reduceMotion}
            onChange={(e) => s.setAccessibility({ reduceMotion: e.target.checked })}
          />
        </label>
        <label className={styles.row}>
          <span>
            {t('settings.highContrast')}
            <br />
            <span className={styles.desc}>{t('settings.highContrast.desc')}</span>
          </span>
          <input
            type="checkbox"
            checked={a11y.highContrast}
            onChange={(e) => s.setAccessibility({ highContrast: e.target.checked })}
          />
        </label>
        <label className={styles.row}>
          <span>
            {t('settings.actionKeys')}
            <br />
            <span className={styles.desc}>{t('settings.actionKeys.desc')}</span>
          </span>
          <input
            type="checkbox"
            checked={s.actionKeys}
            onChange={(e) => s.set({ actionKeys: e.target.checked })}
          />
        </label>
        <div className={styles.row} role="radiogroup" aria-label={t('settings.tileScale')}>
          <span>{t('settings.tileScale')}</span>
          <span className={styles.buttons}>
            {scales.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={a11y.tileScale === o.value}
                className={a11y.tileScale === o.value ? styles.primary : styles.secondary}
                onClick={() => s.setAccessibility({ tileScale: o.value })}
              >
                {o.label}
              </button>
            ))}
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t('settings.language')}</h2>
        <p className={styles.desc}>{t('settings.language.ptBR')}</p>
      </section>

      <section className={styles.section}>
        <h2>{t('settings.data')}</h2>
        <p className={styles.desc}>{t('settings.data.desc')}</p>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              abandonSavedMatch();
              setNotice(t('settings.data.clearMatchDone'));
            }}
          >
            {t('settings.data.clearMatch')}
          </button>
          <button type="button" className={styles.secondary} onClick={() => setResetOpen(true)}>
            {t('settings.data.reset')}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => s.set({ welcomeSeen: false })}
          >
            {t('settings.welcomeAgain')}
          </button>
        </div>
        {resetOpen && (
          <ConfirmDialog
            glyph="复"
            title={t('settings.data.resetConfirm')}
            message={t('settings.data.resetMessage')}
            confirmLabel={t('settings.data.resetAction')}
            cancelLabel={t('common.cancel')}
            onConfirm={() => {
              setResetOpen(false);
              s.resetAll();
              setNotice(t('settings.data.resetDone'));
            }}
            onCancel={() => setResetOpen(false)}
          />
        )}
        {notice && (
          <p className={styles.note} role="status">
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}
