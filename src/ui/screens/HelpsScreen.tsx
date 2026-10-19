/** /ajudas: configuração das ajudas, rótulos e atalhos de teclado (spec 9 e 10.3). */
import { t } from '../../i18n';
import { HelpSettings } from '../components/HelpSettings';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
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
      <KeyboardShortcuts />
      <BackLink forward to="/configuracoes" label={t('settings.title')} />
    </main>
  );
}
