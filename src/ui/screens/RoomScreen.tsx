/**
 * /sala/:codigo (spec 13.2): lobby (assentos, quem está na sala, personagens dos bots, código e link) e,
 * durante a partida, a mesma mesa do solo com o código à vista, avisos de quem saiu ou voltou e o
 * "(bot)" de quem está sendo coberto (ADR 0020). Convidados veem "Anfitrião desconectado" se o
 * anfitrião cair (13.6). Ao fim da partida, todos voltam a esta tela.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CharacterId } from '../../bots';
import type { RuleSet, Seat } from '../../engine';
import { t, tKey, type MessageKey } from '../../i18n';
import { isGooglePhoto, parseRoomCode } from '../../session';
import { useAccount } from '../../state/account';
import { GOOGLE_AVATAR } from '../../state/profile';
import { RoomController, type RoomSettings, type RoomState } from '../../state/roomController';
import { Avatar } from '../components/Avatar';
import { CharacterPicker } from '../components/CharacterPicker';
import { characterOptions } from '../components/characterOptions';
import { BackLink } from '../components/BackLink';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { enterGameDisplay, exitGameDisplay } from '../platform/display';
import { Table, type TableRoom } from '../table/Table';
import page from './Page.module.css';
import { GoogleButton } from './ProfileScreen';
import styles from './RoomScreen.module.css';

const WIND = ['東', '南', '西', '北'];
/** Tempo sem o anfitrião antes do aviso (evita piscar em reconexões rápidas). */
const HOST_AWAY_MS = 3000;

/** Quem está na sala agora (online), sentado ou não, com o anfitrião primeiro. */
function Members({ state }: { state: RoomState }) {
  const hostUid = state.meta?.hostUid;
  const present = Object.entries(state.members)
    .filter(([uid]) => state.online.has(uid))
    .sort(([a], [b]) => Number(b === hostUid) - Number(a === hostUid));
  return (
    <section className={page.section} aria-labelledby="members-title">
      <h2 id="members-title">
        {t('room.members')} <small className={styles.count}>{present.length}</small>
      </h2>
      {present.length <= 1 && <p className={page.desc}>{t('room.members.empty')}</p>}
      <ul className={styles.members}>
        {present.map(([uid, m]) => {
          const seat = state.seats.findIndex((s) => s.type === 'human' && s.uid === uid);
          return (
            <li key={uid} className={seat < 0 ? styles.memberStanding : styles.member}>
              <Avatar avatar={m.avatar} photoURL={m.photoURL} size={34} />
              <span className={styles.memberName}>
                {m.displayName}
                {uid === hostUid && <small> · {t('room.host')}</small>}
              </span>
              <span className={styles.memberStatus}>
                {seat < 0
                  ? t('room.members.standing')
                  : t('room.members.seated', { wind: WIND[seat] ?? '' })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Lobby({ room, state }: { room: RoomController; state: RoomState }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<'close' | 'back' | 'leave' | 'start' | null>(null);
  const meta = state.meta;
  if (!meta) return null;
  const rules = JSON.parse(meta.rules) as RuleSet;
  const settings = JSON.parse(meta.settings) as RoomSettings;
  const link = `${globalThis.location.origin}/sala/${room.code}`;
  const timer =
    settings.timer.mode === 'unlimited'
      ? t('setup.timer.unlimited')
      : `${settings.timer.baseSeconds}+${settings.timer.bankSeconds}`;
  const unseated = room.unseated();

  const copy = async () => {
    try {
      await globalThis.navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const start = () => {
    setConfirm(null);
    void enterGameDisplay();
    void room.startMatch();
  };

  const close = () => {
    setConfirm(null);
    void room.closeRoom().then(() => navigate('/salas'));
  };

  return (
    <main className={`${page.page} ${styles.enter}`}>
      <header className={page.header}>
        <BackLink
          to="/salas"
          label={t('rooms.title')}
          onClick={(e) => {
            // Sempre pergunta: o anfitrião fecha a sala; o convidado sai (e libera o assento).
            e.preventDefault();
            setConfirm(state.isHost ? 'back' : 'leave');
          }}
        />
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
                    <Avatar avatar={s.avatar ?? 'chun'} photoURL={s.photoURL} size={42} />
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
                  <div className={styles.botPicker}>
                    <CharacterPicker<'' | CharacterId>
                      label={t('room.botFor', { n: i + 1 })}
                      value={s.type === 'bot' ? (s.characterId ?? '') : ''}
                      options={characterOptions<''>(
                        {
                          value: '',
                          name: t('room.emptyBot'),
                          tag: t('setup.character.random.tag'),
                        },
                        `${t('room.bot')}: `,
                      )}
                      onChange={(v) => void room.setBot(i, v || null)}
                    />
                  </div>
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

      <Members state={state} />

      {state.isHost ? (
        <div className={page.buttons}>
          <button
            type="button"
            className={page.primary}
            disabled={state.mySeat === null}
            onClick={() => (unseated.length > 0 ? setConfirm('start') : start())}
          >
            {t('room.start')}
          </button>
          <button type="button" className={page.secondary} onClick={() => setConfirm('close')}>
            {t('room.close')}
          </button>
        </div>
      ) : (
        <p className={page.lead} role="status">
          {state.mySeat === null ? t('room.pickSeat') : t('room.waiting')}
        </p>
      )}

      {confirm === 'close' && (
        <ConfirmDialog
          danger
          glyph="閉"
          title={t('room.close.title')}
          message={t('room.close.message')}
          confirmLabel={t('room.close')}
          cancelLabel={t('common.cancel')}
          onConfirm={close}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'back' && (
        <ConfirmDialog
          danger
          glyph="退"
          title={t('room.back.title')}
          message={t('room.back.message')}
          confirmLabel={t('room.back.confirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={close}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'leave' && (
        <LeaveRoomDialog
          message={t('room.leave.lobby.message')}
          onConfirm={() => {
            setConfirm(null);
            room.forget();
            if (state.mySeat !== null) void room.leaveSeat();
            navigate('/salas');
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'start' && (
        <ConfirmDialog
          glyph="座"
          title={t('room.start.unseated.title')}
          message={t('room.start.unseated.message', {
            names: unseated.map((m) => m.displayName).join(', '),
          })}
          confirmLabel={t('room.start.unseated.confirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={start}
          onCancel={() => setConfirm(null)}
        />
      )}
    </main>
  );
}

/** Entrou com a partida em andamento: espera a mão acabar para assumir um bot. */
function WaitingSeat({ room, state }: { room: RoomController; state: RoomState }) {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const full = !state.seats.some((s) => s.type === 'bot');
  return (
    <main className={`${page.page} ${styles.enter}`}>
      {leaving && (
        <LeaveRoomDialog
          message={t('room.leave.waiting.message')}
          onConfirm={() => {
            room.forget();
            navigate('/salas');
          }}
          onCancel={() => setLeaving(false)}
        />
      )}
      <header className={page.header}>
        <BackLink
          to="/salas"
          label={t('rooms.title')}
          onClick={(e) => {
            e.preventDefault();
            setLeaving(true);
          }}
        />
        <h1 className={page.title}>{t('room.waitingSeat.title')}</h1>
      </header>
      <section className={`${page.section} ${styles.codeCard}`}>
        <span className={styles.waitSeal} aria-hidden="true">
          待
        </span>
        <span className={page.desc}>{t('room.code')}</span>
        <strong className={styles.code}>{room.code}</strong>
        <p className={page.lead} role="status">
          {full ? t('room.waitingSeat.full') : t('room.waitingSeat')}
        </p>
      </section>
      <Members state={state} />
    </main>
  );
}

/** Convidado confirma antes de sair da sala (lobby ou esperando a vez de entrar). */
function LeaveRoomDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      danger
      glyph="退"
      title={t('room.leave.title')}
      message={message}
      confirmLabel={t('room.leave')}
      cancelLabel={t('room.leave.stay')}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/** Estados da sala que não são lobby nem mesa: selo, título, explicação e para onde ir. */
type StatusKind = 'loading' | 'notFound' | 'closed' | 'outdated' | 'error';

const STATUS: Record<
  StatusKind,
  { glyph: string; title: MessageKey; text: MessageKey; alert: boolean }
> = {
  loading: { glyph: '待', title: 'room.status.loading', text: 'room.loading', alert: false },
  notFound: { glyph: '無', title: 'room.status.notFound', text: 'room.notFound', alert: true },
  closed: { glyph: '閉', title: 'room.status.closed', text: 'room.closed', alert: true },
  outdated: { glyph: '新', title: 'room.status.outdated', text: 'room.outdated', alert: false },
  error: { glyph: '誤', title: 'room.status.error', text: 'room.error', alert: true },
};

function RoomStatus({ kind, text }: { kind: StatusKind; text?: string }) {
  const navigate = useNavigate();
  const info = STATUS[kind];
  const busy = kind === 'loading';
  const seal = [
    styles.statusSeal,
    info.alert ? styles.statusAlert : '',
    busy ? styles.statusBusy : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <main className={`${page.page} ${styles.statusPage}`}>
      <section
        className={`${page.section} ${styles.statusCard}`}
        role={busy ? 'status' : 'alert'}
        aria-busy={busy}
      >
        <span className={seal} aria-hidden="true">
          {info.glyph}
        </span>
        <h1 className={styles.statusTitle}>{t(info.title)}</h1>
        <p className={page.lead}>{text ?? t(info.text)}</p>
        {!busy && (
          <div className={`${page.buttons} ${styles.statusButtons}`}>
            {kind === 'outdated' || kind === 'error' ? (
              <button
                type="button"
                className={page.primary}
                onClick={() => globalThis.location.reload()}
              >
                {t('room.status.reload')}
              </button>
            ) : (
              <button type="button" className={page.primary} onClick={() => navigate('/salas')}>
                {t('room.status.toRooms')}
              </button>
            )}
            <button type="button" className={page.secondary} onClick={() => navigate('/')}>
              {t('common.back')}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function RoomView({
  code,
  uid,
  name,
  avatar,
  photoURL,
}: {
  code: string;
  uid: string;
  name: string;
  avatar: string;
  photoURL: string | null;
}) {
  const room = useMemo(
    () =>
      new RoomController(code, {
        uid,
        displayName: name,
        avatar,
        ...(photoURL ? { photoURL } : {}),
      }),
    [code, uid, name, avatar, photoURL],
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

  const tableRoom = useMemo<TableRoom>(() => {
    const covered = new Set<Seat>();
    state.seats.forEach((s, i) => {
      if (s.type === 'human' && s.cover) covered.add(i as Seat);
    });
    const mine = state.mySeat === null ? undefined : state.seats[state.mySeat];
    return {
      code: room.code,
      isHost: state.isHost,
      covered,
      myCover: mine?.cover ?? null,
      notices: state.notices,
      onResume: () => void room.resume(),
    };
  }, [room, state.seats, state.mySeat, state.isHost, state.notices]);

  const leave = (to: string) => {
    void exitGameDisplay();
    navigate(to);
  };

  switch (state.phase) {
    case 'loading':
      return <RoomStatus kind="loading" />;
    case 'notFound':
      return <RoomStatus kind="notFound" />;
    case 'closed':
      return <RoomStatus kind="closed" />;
    case 'outdated':
      return <RoomStatus kind="outdated" />;
    case 'error':
      return <RoomStatus kind="error" />;
    default:
      break;
  }
  if (state.session) {
    return (
      <>
        <Table
          key={state.session.localSeat}
          session={state.session}
          room={tableRoom}
          onExit={() => {
            // Anfitrião sair encerra a partida para todos; convidado sai e um bot assume.
            if (state.isHost) void room.closeRoom();
            leave('/');
          }}
          onResultMenu={() => leave('/')}
          onPlayAgain={() => {
            void exitGameDisplay();
            void room.backToRoom();
          }}
        />
        {hostAway && state.meta?.status === 'playing' && (
          <div className={styles.away} role="alertdialog" aria-labelledby="away-title">
            <div className={styles.awayCard}>
              <span className={styles.awaySeal} aria-hidden="true">
                待
              </span>
              <h2 id="away-title">{t('room.hostAway')}</h2>
              <p>{t('room.hostAway.desc')}</p>
              <button type="button" className={page.secondary} onClick={() => leave('/salas')}>
                {t('room.leave')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
  if (state.meta?.status === 'playing' && !state.isHost && state.mySeat === null)
    return <WaitingSeat room={room} state={state} />;
  if (state.phase === 'starting' || state.phase === 'playing')
    return <RoomStatus kind="loading" text={t('room.joining')} />;
  return <Lobby room={room} state={state} />;
}

export function RoomScreen() {
  const { codigo } = useParams();
  const code = parseRoomCode(codigo ?? '');
  const { status, user, profile } = useAccount();
  if (!code) return <RoomStatus kind="notFound" />;
  if (status === 'loading') return <RoomStatus kind="loading" text={t('account.loading')} />;
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
  // A foto vai para a sala só quando é o avatar escolhido (os outros a veem na mesa).
  const photo =
    profile.avatar === GOOGLE_AVATAR && isGooglePhoto(user.photoURL) ? user.photoURL : null;
  return (
    <RoomView
      code={code}
      uid={user.uid}
      name={profile.displayName}
      avatar={profile.avatar}
      photoURL={photo}
    />
  );
}
