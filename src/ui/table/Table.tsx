/**
 * A mesa (spec 10.2): palco 1600×900; plano da mesa com perspectiva suave; mão do jogador sem
 * perspectiva. Fala só com a MatchSession (spec 5.1).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  isYaochu,
  type Action,
  type PlayerEvent,
  type PlayerView,
  type Tile as TileData,
} from '../../engine';
import { t } from '../../i18n';
import { formatClock, type MatchSession } from '../../session';
import { useSettings } from '../../state/settings';
import { doraPairs } from '../../help';
import { DecisionDialog, type DecisionOption } from '../components/DecisionDialog';
import { TileLabelsContext } from '../components/tileLabels';
import { tileName } from '../components/tileName';
import { HelpPanel } from './HelpPanel';
import { Tile } from '../components/Tile';
import { play } from '../../audio/sounds';
import { useGameSounds } from '../audio/useGameSounds';
import { toggleFullscreen } from '../platform/display';
import { ActionBar } from './ActionBar';
import { ACTION_KEYS, availableActions, type ActionKey } from './actions';
import { NUMBER_KANJI, relativeSide, seatName, windKanji, windName, windShort } from './labels';
import { PlayerHand } from './PlayerHand';
import { Stage } from './Stage';
import { HandSummaryDialog, MatchResultDialog } from './SummaryDialogs';
import styles from './Table.module.css';
import { CenterPanel, HiddenHand, Melds, Pond } from './TableParts';
import { useClock, useMatch } from './useMatch';

interface Dialog {
  readonly title: string;
  readonly description?: string;
  readonly options: readonly DecisionOption[];
  readonly actions: Readonly<Record<string, Action>>;
}

const uniqueTiles = (tiles: readonly TileData[]) => {
  const seen = new Map<string, TileData>();
  for (const x of tiles) if (!seen.has(`${x.kind}:${x.red}`)) seen.set(`${x.kind}:${x.red}`, x);
  return [...seen.values()];
};

function buildDialog(kind: ActionKey, view: PlayerView): Dialog | Action {
  const legal = view.legal;
  const call = view.callTile?.tile;
  const pairOptions = (
    title: string,
    type: 'pon' | 'chi',
    uses: readonly (readonly [TileData, TileData])[],
  ): Dialog | Action => {
    const first = uses[0];
    if (uses.length === 1 && first) return { type, use: [first[0], first[1]] };
    const options: DecisionOption[] = [];
    const actions: Record<string, Action> = {};
    uses.forEach((use, i) => {
      const key = `${type}-${i}`;
      options.push({
        key,
        tiles: call ? [...use, call].sort((a, b) => a.kind - b.kind) : [...use],
      });
      actions[key] = { type, use: [use[0], use[1]] };
    });
    return { title, options, actions };
  };
  switch (kind) {
    case 'pon':
      return pairOptions(t('decision.pon'), 'pon', legal.pon);
    case 'chi':
      return pairOptions(t('decision.chi'), 'chi', legal.chi);
    case 'riichi': {
      const tiles = uniqueTiles(legal.riichi);
      const options = tiles.map((tile) => ({ key: `r-${tile.id}`, tiles: [tile] }));
      const actions = Object.fromEntries(
        tiles.map((tile) => [`r-${tile.id}`, { type: 'discard', tile, riichi: true } as Action]),
      );
      return {
        title: t('decision.riichi'),
        description: t('decision.riichiHint'),
        options,
        actions,
      };
    }
    case 'kan': {
      const options: DecisionOption[] = [];
      const actions: Record<string, Action> = {};
      if (legal.daiminkan && call) {
        options.push({
          key: 'daiminkan',
          tiles: [...view.hand.filter((x) => x.kind === call.kind), call],
        });
        actions.daiminkan = { type: 'daiminkan' };
      }
      for (const k of legal.ankan) {
        options.push({ key: `ankan-${k}`, tiles: view.hand.filter((x) => x.kind === k) });
        actions[`ankan-${k}`] = { type: 'ankan', kind: k };
      }
      for (const tile of legal.kakan) {
        const meld = view.players[view.seat]?.melds.find(
          (m) => m.type === 'pon' && m.called.kind === tile.kind,
        );
        options.push({ key: `kakan-${tile.id}`, tiles: [...(meld?.tiles ?? []), tile] });
        actions[`kakan-${tile.id}`] = { type: 'kakan', tile };
      }
      const only = options[0];
      if (options.length === 1 && only) return actions[only.key] as Action;
      return { title: t('decision.kan'), options, actions };
    }
    case 'kyuushu': {
      const tiles = uniqueTiles(view.hand.filter((x) => isYaochu(x.kind)));
      return {
        title: t('action.kyuushu'),
        description: t('decision.kyuushu'),
        options: [{ key: 'yes', tiles, label: t('action.confirm') }],
        actions: { yes: { type: 'kyuushuKyuuhai' } },
      };
    }
    case 'tsumo':
      return { type: 'tsumo' };
    case 'ron':
      return { type: 'ron' };
    case 'kita':
      return { type: 'kita' };
    case 'pass':
      return { type: 'pass' };
  }
}

const isAction = (x: Dialog | Action): x is Action => 'type' in x;

export function Table({
  session,
  onExit,
  onPlayAgain,
}: {
  session: MatchSession;
  onExit: () => void;
  onPlayAgain: () => void;
}) {
  const { view, events, tick, lastDiscardId } = useMatch(session);
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
      if (dialog || e.repeat) return;
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
  const roundTitle = `${windName(view.roundWind)} ${view.handNumber}`;

  const announcement = announce(events, view, session.seats);

  return (
    <TileLabelsContext.Provider value={helps.labels}>
      <Stage>
        <p className={styles.srOnly} aria-live="polite">
          {announcement}
        </p>
        <header className={styles.header}>
          <div className={styles.roundTitle}>
            {roundTitle}
            <span className={styles.roundKanji} aria-hidden="true">
              {windKanji(view.roundWind)}
              {NUMBER_KANJI[view.handNumber - 1]}局
            </span>
          </div>
          <div className={styles.roundInfo}>
            <span>{t('table.honba', { n: view.honba })}</span>
            <span>{t('table.sticks', { n: view.riichiSticks })}</span>
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
          {helps.doraHint &&
            doraPairs(view).map((pair, i) => (
              <div
                key={i}
                className={styles.doraHint}
                title={t('help.dora', {
                  indicator: tileName({ id: -1, kind: pair.indicator, red: false }),
                  dora: tileName({ id: -1, kind: pair.dora, red: false }),
                })}
              >
                <Tile tile={{ id: -200 - i, kind: pair.indicator, red: false }} width={26} />
                <span aria-hidden="true">→</span>
                <span className={styles.doraLabel}>{t('table.dora')}</span>
                <Tile tile={{ id: -300 - i, kind: pair.dora, red: false }} width={26} glow />
              </div>
            ))}
        </section>

        <nav className={styles.menu}>
          <button
            type="button"
            className={settings.muted ? styles.menuOff : styles.menuButton}
            onClick={() => settings.set({ muted: !settings.muted })}
            aria-pressed={!settings.muted}
          >
            ♪ {t('table.menu.sound')}
          </button>
          <button
            type="button"
            className={settings.autoSort ? styles.menuButton : styles.menuOff}
            onClick={() => settings.set({ autoSort: !settings.autoSort })}
            aria-pressed={settings.autoSort}
          >
            ⇅ {t('table.menu.autoSort')}
          </button>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => void toggleFullscreen()}
          >
            ⛶ {t('table.menu.fullscreen')}
          </button>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => {
              if (globalThis.confirm(t('table.menu.exitConfirm'))) onExit();
            }}
          >
            ✕ {t('table.menu.exit')}
          </button>
        </nav>

        <div className={styles.plane}>
          <div className={styles.felt} />
          <CenterPanel view={view} />
          {view.players.map((p) => {
            const side = relativeSide(p.seat, view.seat, n);
            return (
              <div key={p.seat} className={`${styles.side} ${styles[`sideRot${side}`]}`}>
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
                          <Tile key={x.id} tile={x} width={30} />
                        ))}
                      </div>
                    ) : (
                      <HiddenHand count={p.handCount} width={30} />
                    )}
                    <Melds player={p} players={n} width={30} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {view.players.map((p) => {
          const side = relativeSide(p.seat, view.seat, n);
          const name = seatName(session.seats, p.seat);
          return (
            <div
              key={p.seat}
              className={`${styles.badge} ${styles[`badge${side}`]} ${view.turn === p.seat ? styles.badgeTurn : ''}`}
            >
              <span className={styles.portrait} aria-hidden="true">
                {name.slice(0, 1)}
              </span>
              <span className={styles.badgeName}>{name}</span>
              <span className={styles.badgeScore}>{p.score}</span>
              <span className={p.isDealer ? styles.badgeDealer : styles.badgeWind}>
                {windShort(p.seatWind)}
                {p.isDealer ? ` · ${t('table.dealer')}` : ''}
              </span>
              {p.riichi?.established && (
                <span className={styles.badgeRiichi}>{t('table.riichi')}</span>
              )}
            </div>
          );
        })}

        {clock && (
          <div className={styles.clock} aria-label={t('table.clock')}>
            {formatClock(clock, clock.hasBank)}
          </div>
        )}

        <PlayerHand
          hand={view.hand}
          drawn={view.drawn}
          discardable={discardable}
          autoSort={settings.autoSort}
          scale={settings.accessibility.tileScale}
          onDiscard={(tile) => submit({ type: 'discard', tile })}
          onFocusTile={(tile) => setFocusTile(tile ? { tick, tile } : null)}
        />

        {playing && <HelpPanel view={view} focus={focus} prefs={helps} />}

        {revealed && <div className={styles.trainingSeal}>{t('table.training')}</div>}

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

        {view.phase === 'handSummary' && view.summary && (
          <HandSummaryDialog
            summary={view.summary}
            seats={session.seats}
            canContinue={view.legal.ackSummary}
            onContinue={() => submit({ type: 'ackSummary' })}
          />
        )}
        {view.phase === 'matchEnded' && view.result && (
          <MatchResultDialog
            result={view.result}
            seats={session.seats}
            onPlayAgain={onPlayAgain}
            onMenu={onExit}
          />
        )}
      </Stage>
    </TileLabelsContext.Provider>
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
