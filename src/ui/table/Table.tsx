/**
 * A mesa (spec 10.2): palco 1600×900; plano da mesa com perspectiva suave; mão do jogador sem
 * perspectiva. Fala só com a MatchSession (spec 5.1).
 */
import { useEffect, useMemo, useState } from 'react';
import { play } from '../../audio/sounds';
import {
  doraFromIndicator,
  type Action,
  type PlayerEvent,
  type PlayerView,
  type Seat,
  type Tile as TileData,
  type TileKind,
} from '../../engine';
import { doraPairs } from '../../help';
import { t } from '../../i18n';
import { formatClock, type CoverReason, type MatchSession } from '../../session';
import type { RoomNotice } from '../../state/roomController';
import { useSettings } from '../../state/settings';
import { useGameSounds } from '../audio/useGameSounds';
import { Backdrop } from '../components/Backdrop';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DecisionDialog } from '../components/DecisionDialog';
import { PlayerPortrait } from '../components/PlayerPortrait';
import { Tile } from '../components/Tile';
import { TileHighlightContext, type TileHighlight } from '../components/tileHighlight';
import { TileLabelsContext } from '../components/tileLabels';
import { tileName } from '../components/tileName';
import { toggleFullscreen } from '../platform/display';
import { ActionBar } from './ActionBar';
import { ACTION_KEYS, availableActions, type ActionKey } from './actions';
import { CallBanner } from './CallBanner';
import { buildDialog, isAction, type Dialog } from './decisions';
import { HelpPanel } from './HelpPanel';
import { MatchIntro } from './MatchIntro';
import { ExitIcon, FullscreenIcon, MusicIcon, SoundIcon } from './MenuIcons';
import { NUMBER_KANJI, relativeSide, seatName, windKanji, windName } from './labels';
import { PlayerHand } from './PlayerHand';
import { RoundResult } from './RoundResult';
import { Stage } from './Stage';
import { MatchResultDialog } from './SummaryDialogs';
import styles from './Table.module.css';
import { CenterPanel, HiddenHand, Melds, Pond } from './TableParts';
import { useClock, useMatch } from './useMatch';
import { useRecordHistory } from './useRecordHistory';
import { SpeechBubble } from './SpeechBubble';
import { useSpeech } from './useSpeech';

/** O que a mesa mostra a mais numa sala online (ADR 0020). */
export interface TableRoom {
  readonly code: string;
  readonly isHost: boolean;
  /** Assentos de humanos que um bot está jogando agora. */
  readonly covered: ReadonlySet<Seat>;
  /** Um bot está jogando por mim (parado demais). */
  readonly myCover: CoverReason | null;
  readonly notices: readonly RoomNotice[];
  readonly onResume: () => void;
}

export function Table({
  session,
  onExit,
  onPlayAgain,
  onResultMenu = onExit,
  room,
}: {
  session: MatchSession;
  /** Confirmou a saída no meio da partida. */
  onExit: () => void;
  onPlayAgain: () => void;
  /** "Voltar ao menu" no resultado final (padrão: o mesmo que sair). */
  onResultMenu?: () => void;
  room?: TableRoom;
}) {
  const { view, events, tick, lastDiscardId } = useMatch(session);
  useRecordHistory(session, view);
  const speech = useSpeech(events, tick, session.seats);
  const clock = useClock(session);
  const settings = useSettings();
  // A janela de decisão vale só para a situação (tick) em que foi aberta.
  const [openDialog, setOpenDialog] = useState<{ tick: number; dialog: Dialog } | null>(null);
  const dialog = openDialog?.tick === tick ? openDialog.dialog : null;
  const setDialog = (d: Dialog | null) => setOpenDialog(d ? { tick, dialog: d } : null);
  const n = view.rules.players;
  const me = view.players[view.seat];
  const actions = availableActions(view.legal);
  const helps = settings.helps;
  const discardable = useMemo(() => new Set(view.legal.discard.map((x) => x.id)), [view.legal]);
  const [focusTile, setFocusTile] = useState<{ tick: number; tile: TileData } | null>(null);
  const focus =
    focusTile?.tick === tick && discardable.has(focusTile.tile.id) ? focusTile.tile : null;
  const revealed = session.getRevealedHands();

  // Camada de destaques: bônus (dora/vermelhas) e cópias visíveis da peça sob o mouse.
  const [exitOpen, setExitOpen] = useState(false);
  // Apresentação dos jogadores ao abrir a mesa (partida nova ou retomada).
  const [intro, setIntro] = useState(() => ({
    open: view.phase !== 'matchEnded',
    resumed: view.handsPlayed > 0 || view.players.some((p) => p.discards.length > 0),
  }));
  // Com a apresentação ou a janela de sair abertas, a partida (relógio e bots) fica parada.
  const paused = exitOpen || intro.open;
  useEffect(() => {
    session.setPaused(paused);
  }, [paused, session]);
  const [hoverKind, setHoverKind] = useState<TileKind | null>(null);
  const highlight = useMemo<TileHighlight>(
    () => ({
      bonusGlow: helps.bonusGlow,
      bonusKinds: new Set(
        view.doraIndicators.map((d) => doraFromIndicator(d.kind, view.rules.mode)),
      ),
      matchKind: helps.seenHighlight ? hoverKind : null,
    }),
    [helps.bonusGlow, helps.seenHighlight, hoverKind, view.doraIndicators, view.rules.mode],
  );
  const myTurn = view.phase === 'awaitingDiscard' && view.turn === view.seat;
  const myCall = view.phase === 'awaitingCalls' || view.phase === 'awaitingRobbery';

  // "Sem chamadas" (spec 9.5): chi/pon/kan não são oferecidos; Ron continua.
  const shownActions = helps.noCalls
    ? actions.filter(
        (a) => !(view.phase === 'awaitingCalls' && (a === 'chi' || a === 'pon' || a === 'kan')),
      )
    : actions;
  const autoPass =
    helps.noCalls && view.phase === 'awaitingCalls' && view.legal.pass && !view.legal.ron;
  useEffect(() => {
    if (autoPass) session.submit({ type: 'pass' });
  }, [autoPass, tick, session]);

  useGameSounds(events, tick, view.seat);

  // Aviso sonoro quando aparece uma chamada possível para você.
  useEffect(() => {
    if (myCall && !autoPass) play('yourTurn');
  }, [myCall, autoPass, tick]);

  // Aviso de tempo (spec 11.5): quando a base acaba e o banco começa a ser usado.
  const usingBank = clock !== null && clock.baseMs === 0 && clock.hasBank;
  useEffect(() => {
    if (usingBank) play('timeWarning');
  }, [usingBank, tick]);

  const submit = (action: Action) => {
    setDialog(null);
    try {
      session.submit(action);
    } catch {
      // Ação ficou ilegal entre o clique e o envio (ex.: tempo esgotado). A visão se atualiza sozinha.
    }
  };

  const onAction = (key: ActionKey) => {
    // Riichi "direto" só quando há um único descarte possível (spec 7.7); senão sempre pergunta.
    if (key === 'riichi' && helps.riichi === 'auto') {
      const options = new Map(view.legal.riichi.map((x) => [`${x.kind}:${x.red}`, x]));
      const only = options.size === 1 ? [...options.values()][0] : undefined;
      if (only) {
        submit({ type: 'discard', tile: only, riichi: true });
        return;
      }
    }
    const result = buildDialog(key, view);
    if (isAction(result)) submit(result);
    else setDialog(result);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (dialog || paused || e.repeat) return;
      const key = (Object.keys(ACTION_KEYS) as ActionKey[]).find(
        (k) => ACTION_KEYS[k].toLowerCase() === e.key.toLowerCase(),
      );
      if (key && shownActions.includes(key)) {
        e.preventDefault();
        onAction(key);
      }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  });

  const playing = view.phase !== 'handSummary' && view.phase !== 'matchEnded';
  // Durante o resultado, o cabeçalho continua mostrando a mão que acabou de terminar.
  const round =
    view.phase === 'handSummary' && view.summary
      ? { wind: view.summary.roundWind, n: view.summary.handNumber, honba: view.summary.honba }
      : { wind: view.roundWind, n: view.handNumber, honba: view.honba };
  const announcement = announce(events, view, session.seats);

  return (
    <TileLabelsContext.Provider value={helps.labels}>
      <TileHighlightContext.Provider value={highlight}>
        <Stage background={<Backdrop dim />}>
          <p className={styles.srOnly} aria-live="polite">
            {announcement}
          </p>

          <header className={styles.header}>
            <span className={styles.headerGlyph} aria-hidden="true">
              {windKanji(round.wind)}
              {NUMBER_KANJI[round.n - 1]}局
            </span>
            <div>
              <div className={styles.roundTitle}>
                {windName(round.wind)} {round.n}
              </div>
              <div className={styles.roundInfo}>
                <span>{t('table.honba', { n: round.honba })}</span>
                <span>{t('table.sticks', { n: view.riichiSticks })}</span>
              </div>
            </div>
          </header>

          <section className={styles.doraPanel} aria-label={t('table.dora')}>
            <span className={styles.doraLabel}>{t('table.indicator')}</span>
            <div className={styles.doraTiles}>
              {Array.from({ length: 5 }, (_, i) => {
                const ind = view.doraIndicators[i];
                return <Tile key={i} tile={ind ?? null} width={40} />;
              })}
            </div>
            {helps.doraHint && doraPairs(view).length > 0 && (
              // Compacto (duas por linha): com vários dora o painel não invade a placa de baixo.
              <div className={styles.doraHints}>
                <span className={styles.doraHintsLabel}>{t('table.dora')}</span>
                {doraPairs(view).map((pair, i) => (
                  <div
                    key={i}
                    className={styles.doraHint}
                    title={t('help.dora', {
                      indicator: tileName({ id: -1, kind: pair.indicator, red: false }),
                      dora: tileName({ id: -1, kind: pair.dora, red: false }),
                    })}
                  >
                    <Tile tile={{ id: -200 - i, kind: pair.indicator, red: false }} width={26} />
                    <span className={styles.doraArrow} aria-hidden="true" />
                    <Tile tile={{ id: -300 - i, kind: pair.dora, red: false }} width={26} glow />
                  </div>
                ))}
              </div>
            )}
          </section>

          <nav className={styles.menu}>
            <button
              type="button"
              className={settings.muted ? styles.menuOff : styles.menuButton}
              onClick={() => settings.set({ muted: !settings.muted })}
              aria-pressed={!settings.muted}
              aria-label={t('table.menu.sound')}
              title={t('table.menu.sound')}
            >
              <SoundIcon off={settings.muted} />
            </button>
            <button
              type="button"
              className={settings.music ? styles.menuButton : styles.menuOff}
              onClick={() => settings.set({ music: !settings.music })}
              aria-pressed={settings.music}
              aria-label={t('table.menu.music')}
              title={t('table.menu.music')}
            >
              <MusicIcon off={!settings.music} />
            </button>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => void toggleFullscreen()}
              aria-label={t('table.menu.fullscreen')}
              title={t('table.menu.fullscreen')}
            >
              <FullscreenIcon />
            </button>
            <span className={styles.menuDivider} aria-hidden="true" />
            <button
              type="button"
              className={`${styles.menuButton} ${styles.menuExit}`}
              onClick={() => {
                setExitOpen(true);
              }}
              aria-label={t('table.menu.exit')}
              title={t('table.menu.exit')}
            >
              <ExitIcon />
            </button>
          </nav>

          {room && <RoomCode code={room.code} />}

          <div className={styles.plane}>
            <div className={styles.frame} />
            <div className={styles.felt} />
            <CenterPanel view={view} />
            {view.players.map((p) => {
              const side = relativeSide(p.seat, view.seat, n);
              // A mão da frente usa pedras um pouco menores para não encostar na borda nem no rio.
              const edgeTile = side === 2 ? 27 : 30;
              return (
                <div key={p.seat} className={`${styles.side} ${styles[`sideRot${side}`]}`}>
                  <div
                    className={`${styles.pondZone} ${view.turn === p.seat && playing ? styles.pondZoneTurn : ''}`}
                  />
                  <div className={styles.sidePond}>
                    <Pond discards={p.discards} lastId={lastDiscardId} />
                  </div>
                  {side !== 0 && (
                    <div
                      className={`${styles.sideEdge} ${side % 2 === 1 ? styles.edgeFar : styles.edgeNear}`}
                    >
                      {revealed?.[p.seat] ? (
                        <div className={styles.hiddenHand}>
                          {revealed[p.seat]?.map((x) => (
                            <Tile key={x.id} tile={x} width={edgeTile} />
                          ))}
                        </div>
                      ) : (
                        <HiddenHand count={p.handCount} width={edgeTile} />
                      )}
                      <Melds player={p} players={n} width={edgeTile} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {view.players.map((p) => {
            const side = relativeSide(p.seat, view.seat, n);
            const name = seatName(session.seats, p.seat);
            const isTurn = view.turn === p.seat;
            return (
              <div
                key={p.seat}
                className={`${styles.badge} ${styles[`badge${side}`]} ${isTurn ? styles.badgeTurn : ''}`}
                aria-current={isTurn ? 'true' : undefined}
              >
                <PlayerPortrait
                  seat={session.seats[p.seat]}
                  name={name}
                  className={styles.portrait}
                />
                <span className={styles.badgeName}>
                  {name}
                  {room?.covered.has(p.seat) && (
                    <small className={styles.badgeBot} title={t('room.botPlaying')}>
                      {t('room.botTag')}
                    </small>
                  )}
                </span>
                <span className={styles.badgeScore}>{p.score.toLocaleString('pt-BR')}</span>
                <span className={p.isDealer ? styles.badgeDealer : styles.badgeWind}>
                  <span className={styles.badgeWindGlyph} aria-hidden="true">
                    {windKanji(p.seatWind)}
                  </span>
                  {windName(p.seatWind)}
                  {p.isDealer ? ` · ${t('table.dealer')}` : ''}
                </span>
                {p.riichi?.established && (
                  <span className={styles.badgeRiichi}>{t('table.riichi')}</span>
                )}
                {speech?.seat === p.seat && <SpeechBubble speech={speech} side={side} />}
                {p.kita.length > 0 && (
                  <span
                    className={styles.badgeKita}
                    title={t('table.kitaCount', { n: p.kita.length })}
                    aria-label={t('table.kitaCount', { n: p.kita.length })}
                  >
                    <span aria-hidden="true">北</span>×{p.kita.length}
                  </span>
                )}
              </div>
            );
          })}

          {(myTurn || myCall) && playing && (
            <div className={styles.yourTurn} role="status">
              {t('table.yourTurn')}
              {clock && <span className={styles.clock}>{formatClock(clock, clock.hasBank)}</span>}
            </div>
          )}

          <div className={`${styles.handTray} ${myTurn ? styles.handTrayActive : ''}`} />
          <PlayerHand
            hand={view.hand}
            drawn={view.drawn}
            discardable={discardable}
            scale={settings.accessibility.tileScale}
            onDiscard={(tile) => submit({ type: 'discard', tile })}
            onFocusTile={(tile) => setFocusTile(tile ? { tick, tile } : null)}
            onHoverTile={(tile) => setHoverKind(tile ? tile.kind : null)}
          />

          {playing && <HelpPanel view={view} focus={focus} prefs={helps} />}

          {revealed && <div className={styles.trainingSeal}>{t('table.training')}</div>}

          {room && room.notices.length > 0 && (
            <ul className={styles.notices} aria-live="polite">
              {room.notices.map((x) => (
                <li
                  key={x.id}
                  className={
                    x.kind === 'back' || x.kind === 'joined' ? styles.noticeGood : styles.notice
                  }
                >
                  {t(`room.notice.${x.kind}`, { name: x.name })}
                </li>
              ))}
            </ul>
          )}

          {room?.myCover === 'idle' && playing && (
            <div className={styles.covered} role="status">
              <span className={styles.coveredGlyph} aria-hidden="true">
                代
              </span>
              <span>{t('room.covered')}</span>
              <button type="button" className={styles.coveredButton} onClick={room.onResume}>
                {t('room.resume')}
              </button>
            </div>
          )}

          {me && (
            <div className={styles.ownMelds}>
              <Melds player={me} players={n} width={48} />
            </div>
          )}

          {playing && <ActionBar actions={shownActions} onAction={onAction} />}

          {view.callTile && playing && (
            <div className={styles.callTile}>
              <Tile tile={view.callTile.tile} width={56} glow />
            </div>
          )}

          <CallBanner events={events} tick={tick} localSeat={view.seat} players={n} />

          {dialog && (
            <DecisionDialog
              title={dialog.title}
              {...(dialog.description ? { description: dialog.description } : {})}
              options={dialog.options}
              onPick={(key) => {
                const action = dialog.actions[key];
                if (action) submit(action);
              }}
              onCancel={() => setDialog(null)}
            />
          )}

          {intro.open && (
            <MatchIntro
              view={view}
              session={session}
              resumed={intro.resumed}
              onDone={() => setIntro((x) => ({ ...x, open: false }))}
            />
          )}

          {exitOpen && (
            <ConfirmDialog
              onStage
              danger
              glyph="退"
              title={t(room?.isHost ? 'room.exit.host.title' : 'table.exit.title')}
              message={t(
                room
                  ? room.isHost
                    ? 'room.exit.host.message'
                    : 'room.exit.guest.message'
                  : 'table.exit.message',
              )}
              confirmLabel={t(room?.isHost ? 'room.exit.host.confirm' : 'table.exit.confirm')}
              cancelLabel={t('table.exit.cancel')}
              onConfirm={onExit}
              onCancel={() => setExitOpen(false)}
            />
          )}

          {view.phase === 'handSummary' && view.summary && (
            <RoundResult
              key={`${view.handsPlayed}`}
              summary={view.summary}
              seats={session.seats}
              localSeat={view.seat}
              canContinue={view.legal.ackSummary}
              onContinue={() => submit({ type: 'ackSummary' })}
            />
          )}
          {view.phase === 'matchEnded' && view.result && (
            <MatchResultDialog
              result={view.result}
              seats={session.seats}
              playAgainLabel={room ? t('room.backToRoom') : t('result.playAgain')}
              onPlayAgain={onPlayAgain}
              onMenu={onResultMenu}
            />
          )}
        </Stage>
      </TileHighlightContext.Provider>
    </TileLabelsContext.Provider>
  );
}

/** Código da sala sempre à vista durante a partida (quem chegar depois entra com ele). */
function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await globalThis.navigator.clipboard.writeText(`${globalThis.location.origin}/sala/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      className={styles.roomCode}
      onClick={() => void copy()}
      title={t('room.copyLink')}
      aria-label={`${t('room.code')}: ${code}. ${t('room.copyLink')}`}
    >
      <span className={styles.roomCodeLabel}>{copied ? t('room.copied') : t('room.code')}</span>
      <strong className={styles.roomCodeValue}>{code}</strong>
    </button>
  );
}

/** Frase para leitor de tela sobre a última novidade relevante (spec 10.7). */
function announce(
  events: readonly PlayerEvent[],
  view: PlayerView,
  seats: MatchSession['seats'],
): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e) continue;
    switch (e.type) {
      case 'TileDiscarded':
        return t('announce.discard', { name: seatName(seats, e.seat), tile: tileName(e.tile) });
      case 'RiichiDeclared':
        return t('announce.riichi', { name: seatName(seats, e.seat) });
      case 'CallMade':
        return t('announce.call', { name: seatName(seats, e.seat), call: e.meld.type });
      case 'TileDrawn':
        if (e.seat === view.seat && e.tile) return t('announce.draw', { tile: tileName(e.tile) });
        break;
      case 'HandWon':
        return t('announce.win', { name: seatName(seats, e.wins[0]?.seat ?? 0) });
      case 'ExhaustiveDraw':
        return t('announce.draw.exhaustive');
      default:
        break;
    }
  }
  return '';
}
