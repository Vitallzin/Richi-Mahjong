/**
 * /perfil (spec 12.2, 12.5 e 12.6): entrar com Google, nome e avatar, histórico, sair e apagar dados.
 * Sem login, explica o que a conta libera; o jogo solo continua funcionando sem ela.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import { deleteMyData, saveProfile, signIn, signOut, useAccount } from '../../state/account';
import { AVATARS, GOOGLE_AVATAR, NAME_MAX } from '../../state/profile';
import { Avatar } from '../components/Avatar';
import { BackLink } from '../components/BackLink';
import { ConfirmDialog } from '../components/ConfirmDialog';
import page from './Page.module.css';
import styles from './ProfileScreen.module.css';

export function GoogleButton() {
  const status = useAccount((s) => s.status);
  return (
    <button
      type="button"
      className={styles.google}
      onClick={() => void signIn()}
      disabled={status === 'loading'}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"
        />
        <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9z" />
        <path
          fill="#EA4335"
          d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
        />
      </svg>
      {status === 'loading' ? t('account.loading') : t('account.signIn')}
    </button>
  );
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const { status, user, profile, error } = useAccount();
  const [name, setName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [saved, setSaved] = useState(false);

  if (status !== 'signedIn' || !user || !profile) {
    return (
      <main className={page.page}>
        <header className={page.header}>
          <BackLink />
          <h1 className={page.title}>{t('account.title')}</h1>
        </header>
        <section className={`${page.section} ${styles.intro}`}>
          <span className={styles.introSeal} aria-hidden="true">
            友
          </span>
          <h2>{t('account.why')}</h2>
          <ul className={styles.perks}>
            <li>{t('account.perk.rooms')}</li>
            <li>{t('account.perk.history')}</li>
            <li>{t('account.perk.sync')}</li>
          </ul>
          <GoogleButton />
          <p className={page.desc}>{t('account.guestNote')}</p>
          {error && (
            <p className={styles.error} role="alert">
              {t('account.error')} <small>({error})</small>
            </p>
          )}
        </section>
      </main>
    );
  }

  const shownName = name ?? profile.displayName;
  const commitName = () => {
    if (name === null || name === profile.displayName) return;
    void saveProfile({ displayName: name }).then(() => {
      setName(null);
      setSaved(true);
    });
  };

  return (
    <main className={page.page}>
      <header className={page.header}>
        <BackLink />
        <h1 className={page.title}>{t('account.title')}</h1>
      </header>

      <section className={`${page.section} ${styles.card}`}>
        <Avatar avatar={profile.avatar} photoURL={user.photoURL} size={92} />
        <div className={styles.nameBlock}>
          <label className={styles.label} htmlFor="display-name">
            {t('account.name')}
          </label>
          <input
            id="display-name"
            className={styles.input}
            value={shownName}
            maxLength={NAME_MAX}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
            }}
          />
          <span className={page.desc} role="status">
            {saved ? t('account.saved') : t('account.nameHelp', { n: NAME_MAX })}
          </span>
        </div>
      </section>

      <section className={page.section} aria-labelledby="avatar-title">
        <h2 id="avatar-title">{t('account.avatar')}</h2>
        <div className={styles.avatars} role="radiogroup" aria-label={t('account.avatar')}>
          {user.photoURL && (
            <button
              type="button"
              role="radio"
              aria-checked={profile.avatar === GOOGLE_AVATAR}
              aria-label={t('account.avatar.google')}
              title={t('account.avatar.google')}
              className={profile.avatar === GOOGLE_AVATAR ? styles.avatarOn : styles.avatarOption}
              onClick={() => void saveProfile({ avatar: GOOGLE_AVATAR })}
            >
              <Avatar avatar={GOOGLE_AVATAR} photoURL={user.photoURL} size={52} />
            </button>
          )}
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={profile.avatar === a.id}
              aria-label={a.glyph}
              className={profile.avatar === a.id ? styles.avatarOn : styles.avatarOption}
              onClick={() => void saveProfile({ avatar: a.id })}
            >
              <Avatar avatar={a.id} size={52} />
            </button>
          ))}
        </div>
      </section>

      <div className={page.buttons}>
        <button type="button" className={page.primary} onClick={() => navigate('/historico')}>
          {t('account.history')}
        </button>
        <button type="button" className={page.secondary} onClick={() => setConfirmSignOut(true)}>
          {t('account.signOut')}
        </button>
        <button
          type="button"
          className={`${page.secondary} ${styles.danger}`}
          onClick={() => setConfirmDelete(true)}
        >
          {t('account.delete')}
        </button>
      </div>
      <p className={page.desc}>{t('account.privacy')}</p>

      {confirmSignOut && (
        <ConfirmDialog
          glyph="別"
          title={t('account.signOut.title')}
          message={t('account.signOut.message')}
          confirmLabel={t('account.signOut')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            setConfirmSignOut(false);
            void signOut();
          }}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          danger
          glyph="消"
          title={t('account.delete.title')}
          message={t('account.delete.message')}
          confirmLabel={t('account.delete.confirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            setConfirmDelete(false);
            void deleteMyData();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </main>
  );
}
