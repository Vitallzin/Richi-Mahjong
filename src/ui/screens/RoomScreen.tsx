/**
 * /sala/:codigo (spec 13.2): lobby (assentos, personagens dos bots, código e link) e, durante a partida,
 * a mesma mesa do solo. Convidados veem "Anfitrião desconectado" se o anfitrião cair (13.6).
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CHARACTERS, type CharacterId } from '../../bots';
import type { RuleSet } from '../../engine';
import { t, tKey } from '../../i18n';
import { parseRoomCode } from '../../session';
import { useAccount } from '../../state/account';
import { RoomController, type RoomSettings, type RoomState } from '../../state/roomController';
import { Avatar } from '../components/Avatar';
import { BackLink } from '../components/BackLink';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { enterGameDisplay } from '../platform/display';
import { Table } from '../table/Table';
import page from './Page.module.css';
import { GoogleButton } from './ProfileScreen';
import styles from './RoomScreen.module.css';

const WIND = ['東', '南', '西', '北'];
/** Tempo sem o anfitrião antes do aviso (evita piscar em reconexões rápidas). */
const HOST_AWAY_MS = 3000;

function Lobby({ room, state }: { room: RoomController; state: RoomState }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const meta = state.meta;
  if (!meta) return null;
  const rules = JSON.parse(meta.rules) as RuleSet;
  const settings = JSON.parse(meta.settings) as RoomSettings;
  const link = `${globalThis.location.origin}/sala/${room.code}`;
  const timer =
    settings.timer.mode === 'unlimited'
      ? t('setup.timer.unlimited')
      : `${settings.timer.baseSeconds}+${settings.timer.bankSeconds}`;

  const copy = async () => {
    try {
      await globalThis.navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className={page.page}>
      <header className={page.header}>
        <BackLink to="/salas" label={t('rooms.title')} />
        <h1 className={page.title}>{t('room.lobby')}</h1>
      </header>

      <section className={`${page.section} ${styles.codeCard}`}>
        <span className={page.desc}>{t('room.code')}</span>
        <strong className={styles.code}>{room.code}</strong>
        <div className={page.buttons}>
          <button type="button" className={page.secondary} onClick={() => void copy()}>
            {copied ? t('room.copied') : t('room.copyLink')}
          </button>
        </div>
        <span className={page.desc}>
          {t(`setup.mode.${rules.mode}`)} · {tKey(`rules.length.${rules.length}`)} · {timer} ·{' '}
          {t(`setup.difficulty.${settings.difficulty}`)}
        </span>
      </section>

      <section className={page.section} aria-labelledby="seats-title">
        <h2 id="seats-title">{t('room.seats')}</h2>
        <ol className={styles.seats}>
          {state.seats.map((s, i) => {
            const isMe = state.mySeat === i;
            const online = s.uid ? state.online.has(s.uid) : false;
            return (
              <li key={i} className={`${styles.seat} ${isMe ? styles.mine : ''}`}>
                <span className={styles.wind} aria-label={t('room.seatWind', { n: i + 1 })}>
                  {WIND[i]}
                </span>
                {s.type === 'human' ? (
                  <>
                    <Avatar avatar={s.avatar ?? 'chun'} size={42} />
                    <span className={styles.seatName}>
                      {s.displayName}
                      {s.uid === meta.hostUid && <small> · {t('room.host')}</small>}
                    </span>
                    <span
                      className={online ? styles.online : styles.offline}
                      aria-label={online ? t('room.online') : t('room.offline')}
                    />
                  </>
                ) : state.isHost ? (
                  <select
                    className={styles.select}
                    aria-label={t('room.botFor', { n: i + 1 })}
                    value={s.type === 'bot' ? (s.characterId ?? '') : ''}
                    onChange={(e) =>
                      void room.setBot(i, (e.target.value || null) as CharacterId | null)
                    }
                  >
                    <option value="">{t('room.emptyBot')}</option>
                    {CHARACTERS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {t('room.bot')}: {t(`characters.${c.id}.name`)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={styles.seatName}>
                    {s.type === 'bot' && s.characterId
                      ? `${t('room.bot')}: ${t(`characters.${s.characterId}.name`)}`
                      : t('room.empty')}
                  </span>
                )}
                {!state.isHost && s.type !== 'human' && (
                  <button
                    type="button"
                    className={page.secondary}
                    onClick={() => void room.claimSeat(i)}
                  >
                    {t('room.sit')}
                  </button>
                )}
                {!state.isHost && isMe && (
                  <button
                    type="button"
                    className={page.secondary}
                    onClick={() => void room.leaveSeat()}
                  >
                    {t('room.stand')}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        <p className={page.desc}>{t('room.botsNote')}</p>
      </section>

      {state.isHost ? (
        <div className={page.buttons}>
          <button
            type="button"
            className={page.primary}
            disabled={state.mySeat === null}
            onClick={() => {
              void enterGameDisplay();
              void room.startMatch();
            }}
          >
            {t('room.start')}
          </button>
          <button type="button" className={page.secondary} onClick={() => setConfirmClose(true)}>
            {t('room.close')}
          </button>
        </div>
      ) : (
        <p className={page.lead} role="status">
          {state.mySeat === null ? t('room.pickSeat') : t('room.waiting')}
        </p>
      )}

      {confirmClose && (
        <ConfirmDialog
          danger
          glyph="閉"
          title={t('room.close.title')}
          message={t('room.close.message')}
          confirmLabel={t('room.close')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            setConfirmClose(false);
            void room.closeRoom().then(() => navigate('/salas'));
          }}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </main>
  );
}

function Message({ text }: { text: string }) {
  return (
    <main className={page.page}>
      <header className={page.header}>
        <BackLink to="/salas" label={t('rooms.title')} />
      </header>
      <p className={page.lead} role="status">
        {text}
      </p>
    </main>
  );
}

function RoomView({
  code,
  uid,
  name,
  avatar,
}: {
  code: string;
  uid: string;
  name: string;
  avatar: string;
}) {
  const room = useMemo(
    () => new RoomController(code, { uid, displayName: name, avatar }),
    [code, uid, name, avatar],
  );
  useEffect(() => {
    void room.start();
    return () => room.dispose();
  }, [room]);
  return <RoomBody room={room} />;
}

function RoomBody({ room }: { room: RoomController }) {
  const navigate = useNavigate();
  const state = useSyncExternalStore(room.subscribe, room.getState);
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(globalThis, { __session: state.session });
  }, [state.session]);

  const hostOnline = state.meta ? state.online.has(state.meta.hostUid) : true;
  const [hostAway, setHostAway] = useState(false);
  useEffect(() => {
    if (state.isHost || hostOnline) {
      const id = setTimeout(() => setHostAway(false), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setHostAway(true), HOST_AWAY_MS);
    return () => clearTimeout(id);
  }, [hostOnline, state.isHost]);

  switch (state.phase) {
    case 'loading':
      return <Message text={t('room.loading')} />;
    case 'notFound':
      return <Message text={t('room.notFound')} />;
    case 'closed':
      return <Message text={t('room.closed')} />;
    case 'outdated':
      return <Message text={t('room.outdated')} />;
    case 'error':
      return <Message text={t('room.error')} />;
    default:
      break;
  }
  if (state.session) {
    return (
      <>
        <Table
          key={state.session.localSeat}
          session={state.session}
          onExit={() => navigate('/salas')}
          onPlayAgain={() => void room.playAgain()}
        />
        {hostAway && state.phase === 'playing' && (
          <div className={styles.away} role="alertdialog" aria-labelledby="away-title">
            <div className={styles.awayCard}>
              <span className={styles.awaySeal} aria-hidden="true">
                待
              </span>
              <h2 id="away-title">{t('room.hostAway')}</h2>
              <p>{t('room.hostAway.desc')}</p>
              <button type="button" className={page.secondary} onClick={() => navigate('/salas')}>
                {t('room.leave')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
  if (state.phase === 'starting' || state.phase === 'playing')
    return <Message text={t('room.joining')} />;
  return <Lobby room={room} state={state} />;
}

export function RoomScreen() {
  const { codigo } = useParams();
  const code = parseRoomCode(codigo ?? '');
  const { status, user, profile } = useAccount();
  if (!code) return <Message text={t('room.notFound')} />;
  if (status === 'loading') return <Message text={t('account.loading')} />;
  if (status !== 'signedIn' || !user || !profile) {
    return (
      <main className={page.page}>
        <header className={page.header}>
          <BackLink to="/salas" label={t('rooms.title')} />
          <h1 className={page.title}>{t('rooms.title')}</h1>
        </header>
        <section className={page.section}>
          <p className={page.desc}>{t('rooms.needLogin')}</p>
          <GoogleButton />
        </section>
      </main>
    );
  }
  return <RoomView code={code} uid={user.uid} name={profile.displayName} avatar={profile.avatar} />;
}
