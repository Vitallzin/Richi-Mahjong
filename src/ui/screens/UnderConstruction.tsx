import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import styles from './SimpleScreen.module.css';

export function UnderConstruction() {
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{t('screen.underConstruction.title')}</h1>
      <p className={styles.body}>{t('screen.underConstruction.body')}</p>
      <Link className={styles.back} to="/">
        {t('common.back')}
      </Link>
    </main>
  );
}
