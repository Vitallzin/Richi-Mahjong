import { useLocation } from 'react-router-dom';
import { t } from '../../i18n';
import styles from './SimpleScreen.module.css';
import { BackLink } from '../components/BackLink';

export function NotFound() {
  const { pathname } = useLocation();
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p className={styles.body}>{t('notFound.body', { path: pathname })}</p>
      <BackLink />
    </main>
  );
}
