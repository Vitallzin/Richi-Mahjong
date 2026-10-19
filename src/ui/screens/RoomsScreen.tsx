/** /salas (spec 13.2): criar uma sala privada ou entrar com código/link. Exige conta Google. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import { parseRoomCode } from '../../session';
import { useAccount } from '../../state/account';
import { BackLink } from '../components/BackLink';
import page from './Page.module.css';
import { GoogleButton } from './ProfileScreen';
import styles from './RoomsScreen.module.css';

export function RoomsScreen() {
  const navigate = useNavigate();
  const status = useAccount((s) => s.status);
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);

  const join = () => {
    const code = parseRoomCode(input);
    if (!code) {
      setInvalid(true);
      return;
    }
    navigate(`/sala/${code}`);
  };

  return (
    <main className={page.page}>
      <header className={page.header}>
        <BackLink />
        <h1 className={page.title}>{t('rooms.title')}</h1>
      </header>
      <p className={page.lead}>{t('rooms.lead')}</p>

      {status !== 'signedIn' ? (
        <section className={page.section}>
          <p className={page.desc}>{t('rooms.needLogin')}</p>
          <GoogleButton />
        </section>
      ) : (
        <div className={styles.cards}>
          <section className={`${page.section} ${styles.card}`}>
            <span className={styles.seal} aria-hidden="true">
              建
            </span>
            <h2>{t('rooms.create')}</h2>
            <p className={page.desc}>{t('rooms.create.desc')}</p>
            <button
              type="button"
              className={page.primary}
              onClick={() => navigate('/jogar?sala=1')}
            >
              {t('rooms.create.button')}
            </button>
          </section>
          <section className={`${page.section} ${styles.card}`}>
            <span className={styles.seal} aria-hidden="true">
              入
            </span>
            <h2>{t('rooms.join')}</h2>
            <label className={page.desc} htmlFor="room-code">
              {t('rooms.join.desc')}
            </label>
            <div className={styles.joinRow}>
              <input
                id="room-code"
                className={styles.code}
                value={input}
                placeholder="ABC234"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={invalid}
                onChange={(e) => {
                  setInput(e.target.value);
                  setInvalid(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') join();
                }}
              />
              <button type="button" className={page.primary} onClick={join}>
                {t('rooms.join.button')}
              </button>
            </div>
            {invalid && (
              <p className={styles.error} role="alert">
                {t('rooms.join.invalid')}
              </p>
            )}
          </section>
        </div>
      )}
      <p className={page.desc}>{t('rooms.note')}</p>
    </main>
  );
}
