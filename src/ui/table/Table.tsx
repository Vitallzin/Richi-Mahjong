/**
 * A mesa (spec 10.2): palco 1600×900; plano da mesa com perspectiva suave; mão do jogador sem
 * perspectiva. Fala só com a MatchSession (spec 5.1).
 */
import { useEffect, useMemo, useState } from 'react';
import { isYaochu, type Action, type Tile as TileData, type PlayerView } from '../../engine';
import { t } from '../../i18n';
import { formatClock, type MatchSession } from '../../session';
import { useSettings } from '../../state/settings';
import { DecisionDialog, type DecisionOption } from '../components/DecisionDialog';
import { Tile } from '../components/Tile';
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
  const discardable = useMemo(() => new Set(view.legal.discard.map((x) => x.id)), [view.legal]);

  useGameSounds(events, tick, view.seat);

  const submit = (action: Action) => {
    setDialog(null);
    try {
      session.submit(action);
    } catch {
      // Ação ficou ilegal entre o clique e o envio (ex.: tempo esgotado). A visão se atualiza sozinha.
    }
  };

  const onAction = (key: ActionKey) => {
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
      if (key && actions.includes(key)) {
        e.preventDefault();
        onAction(key);
      }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  });

  const playing = view.phase !== 'handSummary' && view.phase !== 'matchEnded';
  const roundTitle = `${windName(view.roundWind)} ${view.handNumber}`;

  return (
    <Stage>
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
        <button type="button" className={styles.menuButton} onClick={() => void toggleFullscreen()}>
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
                  <HiddenHand count={p.handCount} width={30} />
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
        onDiscard={(tile) => submit({ type: 'discard', tile })}
      />

      {me && (
        <div className={styles.ownMelds}>
          <Melds player={me} players={n} width={48} />
        </div>
      )}

      {playing && <ActionBar actions={actions} onAction={onAction} />}

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
  );
}
