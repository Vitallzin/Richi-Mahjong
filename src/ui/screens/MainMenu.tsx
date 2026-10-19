import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadMatch } from '../../session/storage';
import { useSettings } from '../../state/settings';
import { useAccount } from '../../state/account';
import { Avatar } from '../components/Avatar';
import { enterGameDisplay } from '../platform/display';
import { t, type MessageKey } from '../../i18n';
import { parseTiles } from '../../engine';
import { Backdrop } from '../components/Backdrop';
import { Tile } from '../components/Tile';
import styles from './MainMenu.module.css';

/** Cada item leva um hanzi que resume a ação (打 jogar, 学 aprender, 助 ajudar…). */
type MenuItem = { key: MessageKey; to: string; glyph: string; comingSoon?: boolean };

const ITEMS: readonly MenuItem[] = [
  { key: 'menu.play', to: '/jogar', glyph: '打' },
  { key: 'menu.tutorial', to: '/tutorial', glyph: '学' },
  { key: 'menu.help', to: '/ajudas', glyph: '助' },
  { key: 'menu.settings', to: '/configuracoes', glyph: '設' },
  { key: 'menu.appearance', to: '/aparencia', glyph: '美' },
  { key: 'menu.profile', to: '/perfil', glyph: '我' },
  { key: 'menu.rooms', to: '/salas', glyph: '房' },
];

const FAN = parseTiles('1z5z6z7z4z');

export function MainMenu() {
  const navigate = useNavigate();
  const [saved] = useState(() => loadMatch().status);
  const welcomeSeen = useSettings((s) => s.welcomeSeen);
  const account = useAccount();
  // O motor e os bots só carregam quando o jogador continua (o menu abre leve).
  const resume = async () => {
    const { resumeSavedMatch } = await import('../../state/match');
    if (!resumeSavedMatch()) return;
    void enterGameDisplay();
    navigate('/partida');
  };
  return (
    <main className={styles.screen}>
      <Backdrop />
      <Link className={styles.account} to="/perfil">
        {account.status === 'signedIn' && account.profile ? (
          <>
            <Avatar avatar={account.profile.avatar} photoURL={account.user?.photoURL} size={34} />
            <span>{account.profile.displayName}</span>
          </>
        ) : (
          <span>
            {account.status === 'loading' ? t('account.loading') : t('account.signInShort')}
          </span>
        )}
      </Link>
      <header className={styles.header}>
        <div className={styles.fan} aria-hidden="true">
          {FAN.map((tile, i) => (
            <span
              key={tile.id}
              className={styles.fanTile}
              style={{ '--i': i - 2 } as CSSProperties}
            >
              <Tile tile={tile} width={58} />
            </span>
          ))}
        </div>
        <h1 className={styles.title}>{t('app.title')}</h1>
        <span className={styles.decoration} aria-hidden="true">
          立直麻雀
        </span>
        <p className={styles.subtitle}>{t('app.subtitle')}</p>
      </header>
      <nav aria-label={t('menu.ariaLabel')}>
        <ul className={styles.list}>
          {saved === 'ok' && (
            <li>
              <button
                type="button"
                className={`${styles.item} ${styles.primary}`}
                onClick={() => void resume()}
              >
                <span className={styles.glyph} aria-hidden="true">
                  再
                </span>
                {t('menu.continue')}
              </button>
            </li>
          )}
          {ITEMS.map((item) => (
            <li key={item.key}>
              {item.comingSoon ? (
                <span className={`${styles.item} ${styles.disabled}`} aria-disabled="true">
                  <span className={styles.glyph} aria-hidden="true">
                    {item.glyph}
                  </span>
                  {t(item.key)}
                  <span className={styles.badge}>{t('menu.comingSoon')}</span>
                </span>
              ) : (
                <Link
                  className={styles.item}
                  to={item.to === '/jogar' && !welcomeSeen ? '/boas-vindas' : item.to}
                >
                  <span className={styles.glyph} aria-hidden="true">
                    {item.glyph}
                  </span>
                  {t(item.key)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {saved === 'incompatible' && <p className={styles.subtitle}>{t('menu.saveIncompatible')}</p>}
    </main>
  );
}
