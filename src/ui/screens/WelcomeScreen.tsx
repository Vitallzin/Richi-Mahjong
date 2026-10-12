/** Boas-vindas no primeiro uso (spec 9.1): explica as ajudas; não bloqueia ("Decidir depois"). */
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import { useSettings } from '../../state/settings';
import { HelpSettings } from '../components/HelpSettings';
import styles from './Page.module.css';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const set = useSettings((s) => s.set);
  const done = () => {
    set({ welcomeSeen: true });
    navigate('/jogar');
  };
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t('welcome.title')}</h1>
      <p className={styles.lead}>{t('welcome.intro')}</p>
      <HelpSettings />
      <div className={styles.buttons}>
        <button type="button" className={styles.primary} onClick={done}>
          {t('welcome.start')}
        </button>
        <button type="button" className={styles.secondary} onClick={done}>
          {t('welcome.later')}
        </button>
        <Link className={styles.link} to="/tutorial" onClick={() => set({ welcomeSeen: true })}>
          {t('welcome.tutorial')}
        </Link>
      </div>
    </main>
  );
}
