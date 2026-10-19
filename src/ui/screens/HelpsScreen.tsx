/** /ajudas: configuração das ajudas, rótulos e atalhos de teclado (spec 9 e 10.3). */
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { HelpSettings } from '../components/HelpSettings';
import styles from './Page.module.css';
import { BackLink } from '../components/BackLink';

export function HelpsScreen() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <BackLink />
        <h1 className={styles.title}>{t('helps.title')}</h1>
      </header>
      <HelpSettings />
      <section className={styles.section}>
        <h2>{t('helps.keyboard.title')}</h2>
        <p className={styles.desc}>{t('helps.keyboard.list')}</p>
      </section>
      <p className={styles.desc}>
        <Link className={styles.link} to="/configuracoes">
          {t('settings.title')} →
        </Link>
      </p>
    </main>
  );
}
