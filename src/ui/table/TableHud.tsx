/**
 * Informações em volta da mesa, no formato enxuto aprovado (fase 3): cartão único de rodada e dora,
 * menu único (som, música, tela cheia, sala, regras, sair) e selos dos jogadores na borda da mesa.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DEFAULT_SELECTION,
  RULE_OPTIONS,
  type RuleSet,
  type Tile as TileData,
  type TileKind,
} from '../../engine';
import { t, tKey } from '../../i18n';
import type { SeatSetup, TimerSettings } from '../../session';
import { PlayerPortrait } from '../components/PlayerPortrait';
import { ruleValueLabel } from '../components/ruleLabels';
import { Tile } from '../components/Tile';
import { tileName } from '../components/tileName';
import confirmStyles from '../components/ConfirmDialog.module.css';
import {
  CopyIcon,
  ExitIcon,
  FullscreenIcon,
  MenuIcon,
  MusicIcon,
  RulesIcon,
  SoundIcon,
} from './MenuIcons';
import { NUMBER_KANJI, windKanji, windName } from './labels';
import styles from './Table.module.css';

/** Rodada, honba, bastões e dora num cartão só (no canto superior esquerdo). */
export function RoundCard({
  round,
  sticks,
  indicators,
  hints,
}: {
  round: { wind: TileKind; n: number; honba: number };
  sticks: number;
  indicators: readonly TileData[];
  /** Dica "indicador → dora" (camada de ajudas), ou null quando desligada. */
  hints: readonly { indicator: TileKind; dora: TileKind }[] | null;
}) {
  return (
    <section className={styles.roundCard} aria-label={t('table.dora')}>
      <div className={styles.roundLine}>
        <span className={styles.roundGlyph} aria-hidden="true">
          {windKanji(round.wind)}
          {NUMBER_KANJI[round.n - 1]}局
        </span>
        <span className={styles.roundTitle}>
          {windName(round.wind)} {round.n}
        </span>
        <span className={styles.roundInfo}>
          <span>{t('table.honba', { n: round.honba })}</span>
          <span>{t('table.sticks', { n: sticks })}</span>
        </span>
      </div>
      <div className={styles.doraLine}>
        <span className={styles.doraLabel}>{t('table.indicator')}</span>
        {Array.from({ length: 5 }, (_, i) => (
          <Tile key={i} tile={indicators[i] ?? null} width={30} />
        ))}
      </div>
      {hints && hints.length > 0 && (
        <div className={styles.doraHints}>
          <span className={styles.doraLabel}>{t('table.dora')}</span>
          {hints.map((pair, i) => (
            <span
              key={i}
              className={styles.doraHint}
              title={t('help.dora', {
                indicator: tileName({ id: -1, kind: pair.indicator, red: false }),
                dora: tileName({ id: -1, kind: pair.dora, red: false }),
              })}
            >
              <Tile tile={{ id: -200 - i, kind: pair.indicator, red: false }} width={24} />
              <span className={styles.doraArrow} aria-hidden="true" />
              <Tile tile={{ id: -300 - i, kind: pair.dora, red: false }} width={24} glow />
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/** Um botão de menu no lugar da barra de ícones; abre a lista com as opções da partida. */
export function TableMenu({
  muted,
  music,
  roomCode,
  onSound,
  onMusic,
  onFullscreen,
  onRules,
  onExit,
}: {
  muted: boolean;
  music: boolean;
  /** Sala online: o código (copiar o link) fica aqui, e não mais à vista na mesa. */
  roomCode: string | null;
  onSound: () => void;
  onMusic: () => void;
  onFullscreen: () => void;
  onRules: () => void;
  onExit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Clicar fora ou Esc fecha.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    globalThis.addEventListener('pointerdown', onPointer);
    globalThis.addEventListener('keydown', onKey);
    return () => {
      globalThis.removeEventListener('pointerdown', onPointer);
      globalThis.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const copy = async () => {
    if (!roomCode) return;
    try {
      await globalThis.navigator.clipboard.writeText(
        `${globalThis.location.origin}/sala/${roomCode}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  /** Fecha o menu e executa a ação. */
  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={root} className={styles.tableMenu}>
      <button
        type="button"
        className={open ? styles.menuToggleOpen : styles.menuToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('table.menu')}
        title={t('table.menu')}
        onClick={() => setOpen((x) => !x)}
      >
        <MenuIcon />
      </button>
      {open && (
        <div className={styles.menuList} role="menu" aria-label={t('table.menu')}>
          <MenuItem
            icon={<SoundIcon off={muted} />}
            label={t('table.menu.sound')}
            state={muted ? t('table.menu.off') : t('table.menu.on')}
            checked={!muted}
            onClick={onSound}
          />
          <MenuItem
            icon={<MusicIcon off={!music} />}
            label={t('table.menu.music')}
            state={music ? t('table.menu.on') : t('table.menu.off')}
            checked={music}
            onClick={onMusic}
          />
          <MenuItem
            icon={<FullscreenIcon />}
            label={t('table.menu.fullscreen')}
            onClick={run(onFullscreen)}
          />
          {roomCode && (
            <>
              <span className={styles.menuSeparator} role="separator" />
              <MenuItem
                icon={<CopyIcon />}
                label={copied ? t('room.copied') : t('room.code')}
                state={roomCode}
                code
                onClick={() => void copy()}
              />
            </>
          )}
          <MenuItem icon={<RulesIcon />} label={t('table.menu.rules')} onClick={run(onRules)} />
          <span className={styles.menuSeparator} role="separator" />
          <MenuItem icon={<ExitIcon />} label={t('table.menu.exit')} danger onClick={run(onExit)} />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  state,
  checked,
  code = false,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  state?: string;
  /** Liga/desliga (som, música): anunciado como caixa de seleção. */
  checked?: boolean;
  code?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={checked}
      className={danger ? styles.menuItemDanger : styles.menuItem}
      onClick={onClick}
    >
      <span className={styles.menuIcon}>{icon}</span>
      <span>{label}</span>
      {state && <span className={code ? styles.menuCode : styles.menuState}>{state}</span>}
    </button>
  );
}

/**
 * Selo do jogador colado no lado da mesa: retrato com o vento (cinábrio = dealer), nome, riichi e
 * kita. Os pontos ficam no painel do centro (só para leitor de tela aqui).
 */
export function PlayerSeal({
  side,
  seat,
  name,
  wind,
  dealer,
  score,
  riichi,
  kita,
  bot,
  turn,
  children,
}: {
  side: number;
  seat: SeatSetup | undefined;
  name: string;
  wind: TileKind;
  dealer: boolean;
  score: number;
  riichi: boolean;
  kita: number;
  /** Um bot está jogando no lugar desta pessoa (sala). */
  bot: boolean;
  turn: boolean;
  /** Balão de fala. */
  children?: ReactNode;
}) {
  return (
    <div
      className={`${styles.seal} ${styles[`seal${side}`]} ${turn ? styles.sealTurn : ''}`}
      aria-current={turn ? 'true' : undefined}
    >
      <span className={styles.sealPortrait}>
        <PlayerPortrait seat={seat} name={name} className={styles.portrait} />
        <span
          className={dealer ? styles.sealWindDealer : styles.sealWind}
          title={dealer ? `${windName(wind)} · ${t('table.dealer')}` : windName(wind)}
        >
          {windKanji(wind)}
        </span>
      </span>
      <span className={styles.sealName}>
        {name}
        <span className={styles.srOnly}>
          {`, ${windName(wind)}${dealer ? `, ${t('table.dealer')}` : ''}, ${t('table.seal.points', { points: score.toLocaleString('pt-BR') })}`}
        </span>
      </span>
      {bot && (
        <small className={styles.badgeBot} title={t('room.botPlaying')}>
          {t('room.botTag')}
        </small>
      )}
      {riichi && <span className={styles.sealRiichi}>{t('table.riichi')}</span>}
      {kita > 0 && (
        <span
          className={styles.badgeKita}
          title={t('table.kitaCount', { n: kita })}
          aria-label={t('table.kitaCount', { n: kita })}
        >
          <span aria-hidden="true">北</span>×{kita}
        </span>
      )}
      {children}
    </div>
  );
}

/** "Regras desta partida": modalidade, tempo e cada regra (as diferentes do padrão em destaque). */
export function RulesDialog({
  rules,
  timer,
  onClose,
}: {
  rules: RuleSet;
  timer: TimerSettings;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  const defaults = DEFAULT_SELECTION[rules.mode];
  const values = rules as unknown as Readonly<Record<string, unknown>>;
  const options = RULE_OPTIONS.filter((o) => o.modes.includes(rules.mode));
  const timerLabel =
    timer.mode === 'unlimited'
      ? t('setup.timer.unlimited')
      : `${timer.baseSeconds}+${timer.bankSeconds}`;
  return (
    <div className={`${confirmStyles.backdrop} ${confirmStyles.onStage}`} onClick={onClose}>
      <div
        className={`${confirmStyles.dialog} ${styles.rulesDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <span className={confirmStyles.seal} aria-hidden="true">
          規
        </span>
        <h2 id="rules-title" className={confirmStyles.title}>
          {t('table.menu.rules')}
        </h2>
        <ul className={styles.rulesList}>
          <li>
            <span>{t('setup.mode')}</span>
            <strong>{t(`setup.mode.${rules.mode}`)}</strong>
          </li>
          <li>
            <span>{t('setup.timer')}</span>
            <strong>{timerLabel}</strong>
          </li>
          {options.map((o) => {
            const value = values[o.id];
            const changed = value !== defaults[o.id];
            return (
              <li key={o.id} className={changed ? styles.rulesChanged : undefined}>
                <span>{tKey(o.label)}</span>
                <strong>
                  {ruleValueLabel(o, value)}
                  {changed && <em> ({t('table.rules.changed')})</em>}
                </strong>
              </li>
            );
          })}
        </ul>
        <div className={confirmStyles.buttons}>
          <button ref={close} type="button" className={confirmStyles.confirm} onClick={onClose}>
            {t('table.rules.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
