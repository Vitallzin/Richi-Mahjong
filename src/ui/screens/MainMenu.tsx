import { Link } from 'react-router-dom';
import { t, type MessageKey } from '../../i18n';
import styles from './MainMenu.module.css';

type MenuItem = { key: MessageKey; to: string; comingSoon?: boolean };

const ITEMS: readonly MenuItem[] = [
  { key: 'menu.play', to: '/jogar' },
  { key: 'menu.tutorial', to: '/tutorial' },
  { key: 'menu.help', to: '/ajudas' },
  { key: 'menu.settings', to: '/configuracoes' },
  { key: 'menu.appearance', to: '/aparencia' },
  { key: 'menu.rooms', to: '/salas', comingSoon: true },
];

export function MainMenu() {
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.decoration} aria-hidden="true">
          東一局
        </span>
        <h1 className={styles.title}>{t('app.title')}</h1>
        <p className={styles.subtitle}>{t('app.subtitle')}</p>
      </header>
      <nav aria-label={t('menu.ariaLabel')}>
        <ul className={styles.list}>
          {ITEMS.map((item) => (
            <li key={item.key}>
              {item.comingSoon ? (
                <span className={`${styles.item} ${styles.disabled}`} aria-disabled="true">
                  {t(item.key)}
                  <span className={styles.badge}>{t('menu.comingSoon')}</span>
                </span>
              ) : (
                <Link className={styles.item} to={item.to}>
                  {t(item.key)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
