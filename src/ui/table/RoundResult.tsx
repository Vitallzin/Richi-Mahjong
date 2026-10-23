/**
 * Fim de mão no ritmo do Mahjong Soul (pedido do desenvolvedor), com arte própria:
 * 1) anúncio em tela cheia (Ron!/Tsumo!/Empate) → 2) mão revelada, yaku um a um, han/fu e selo do
 * limite → 3) placar de todos com os pontos voando de quem paga para quem ganha → 4) Continuar.
 * Clicar durante as animações pula para o fim da etapa.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { play } from '../../audio/sounds';
import { compareTiles, type HandSummary, type Seat, type WinRecord } from '../../engine';
import { t } from '../../i18n';
import type { SeatSetup } from '../../session';
import { PlayerPortrait } from '../components/PlayerPortrait';
import { Tile } from '../components/Tile';
import { relativeSide, seatName, windKanji, windName } from './labels';
import styles from './RoundResult.module.css';
import { useCountUp } from './useCountUp';

type Step =
  { kind: 'announce' } | { kind: 'win'; index: number } | { kind: 'draw' } | { kind: 'scores' };

const ANNOUNCE_MS = 1700;
/** Ron: tempo extra para o raio sair de quem ganhou e atingir quem descartou. */
const ANNOUNCE_RON_MS = 2600;
const YAKU_START_MS = 900;
const YAKU_STEP_MS = 420;
const COUNT_DELAY_MS = 900;
const COUNT_MS = 1600;

const LIMIT_GLYPH: Record<string, string> = {
  mangan: '満貫',
  haneman: '跳満',
  baiman: '倍満',
  sanbaiman: '三倍満',
  yakuman: '役満',
};

const ORIGIN = { x: 800, y: 450 };

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function stepsOf(summary: HandSummary): Step[] {
  const steps: Step[] = [{ kind: 'announce' }];
  if (summary.kind === 'win')
    summary.wins.forEach((_, index) => steps.push({ kind: 'win', index }));
  else steps.push({ kind: 'draw' });
  steps.push({ kind: 'scores' });
  return steps;
}

// ---------------------------------------------------------------------------------------------

/** Onde cada lado está sentado no palco 1600×900 (origem e alvo do raio do ron). */
const BEAM_POS: Record<number, { x: number; y: number }> = {
  0: { x: 800, y: 790 },
  1: { x: 1400, y: 450 },
  2: { x: 800, y: 110 },
  3: { x: 200, y: 450 },
};

function ronLine(win: WinRecord, seats: readonly SeatSetup[], localSeat: Seat): string {
  const from = win.from ?? win.seat;
  if (win.seat === localSeat) return t('summary.ronByYou', { loser: seatName(seats, from) });
  if (from === localSeat) return t('summary.ronOnYou', { winner: seatName(seats, win.seat) });
  return t('summary.ronOn', { winner: seatName(seats, win.seat), loser: seatName(seats, from) });
}

/** Raio dourado de quem fez ron até quem descartou, com a pedra da vitória e o impacto (放銃). */
function RonStrike({ win, side, fromSide }: { win: WinRecord; side: number; fromSide: number }) {
  const a = BEAM_POS[side] ?? ORIGIN;
  const b = BEAM_POS[fromSide] ?? ORIGIN;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  useEffect(() => {
    const ids = [
      globalThis.setTimeout(() => play('whoosh'), 650),
      globalThis.setTimeout(() => play('stamp'), 1000),
    ];
    return () => ids.forEach((id) => globalThis.clearTimeout(id));
  }, []);
  return (
    <div className={styles.ronStrike} aria-hidden="true">
      <span className={styles.ronSource} style={{ left: a.x, top: a.y }} />
      <span
        className={styles.ronBeam}
        style={{ left: a.x, top: a.y, width: length, rotate: `${angle}deg` }}
      />
      <span
        className={styles.ronTile}
        style={{ left: a.x, top: a.y, '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties}
      >
        <Tile tile={win.winTile} width={58} glow />
      </span>
      <span className={styles.ronImpact} style={{ left: b.x, top: b.y }}>
        <span className={styles.ronImpactSeal}>放銃</span>
      </span>
    </div>
  );
}

function Announce({
  summary,
  seats,
  localSeat,
  onDone,
}: {
  summary: HandSummary;
  seats: readonly SeatSetup[];
  localSeat: Seat;
  onDone: () => void;
}) {
  const first = summary.wins[0];
  const isWin = summary.kind === 'win' && first;
  const tsumo = first?.winType === 'tsumo';
  const rons = isWin ? summary.wins.filter((w) => w.winType === 'ron' && w.from !== null) : [];
  const ms = rons.length > 0 ? ANNOUNCE_RON_MS : ANNOUNCE_MS;
  useEffect(() => {
    const id = globalThis.setTimeout(onDone, ms);
    return () => globalThis.clearTimeout(id);
  }, [onDone, ms]);
  const n = seats.length;
  const glyph = isWin ? (tsumo ? '自摸' : '荣') : '流局';
  const word = isWin
    ? tsumo
      ? t('summary.tsumo')
      : t('summary.ron')
    : summary.kind === 'exhaustive'
      ? t('summary.exhaustive')
      : t('summary.abortive');
  return (
    <>
      {rons.map((w) => (
        <RonStrike
          key={w.seat}
          win={w}
          side={relativeSide(w.seat, localSeat, n)}
          fromSide={relativeSide(w.from ?? w.seat, localSeat, n)}
        />
      ))}
      <button type="button" className={styles.announce} onClick={onDone} aria-live="assertive">
        <span className={styles.announceRays} aria-hidden="true" />
        <span className={styles.announceGlyph} aria-hidden="true">
          {glyph}
        </span>
        <span className={isWin ? styles.announceWord : styles.announceWordSmall}>
          {word}
          {isWin ? '!' : ''}
        </span>
        {isWin && rons.length === 0 && (
          <span className={styles.announceName}>
            {summary.wins.map((w) => seatName(seats, w.seat)).join(' · ')}
          </span>
        )}
        {rons.map((w) => (
          <span key={w.seat} className={styles.announceName}>
            {ronLine(w, seats, localSeat)}
          </span>
        ))}
        {summary.kind === 'abortive' && summary.abortiveReason && (
          <span className={styles.announceName}>
            {t(`summary.abortive.${summary.abortiveReason}`)}
          </span>
        )}
      </button>
    </>
  );
}

function WinStep({
  win,
  summary,
  seats,
  instant,
  onSkip,
  onNext,
  nextLabel,
}: {
  win: WinRecord;
  summary: HandSummary;
  seats: readonly SeatSetup[];
  instant: boolean;
  onSkip: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const s = win.scored;
  const hand = win.hand.filter((x) => x.id !== win.winTile.id).sort(compareTiles);
  const lines: { name: string; value: string; desc?: string }[] = [
    ...s.yakuman.map((y) => ({
      name: t(`yaku.${y.id}.name`),
      value: y.value > 1 ? t('summary.yakumanMulti', { n: y.value }) : t('summary.yakuman'),
      desc: t(`yaku.${y.id}.desc`),
    })),
    ...s.yaku.map((y) => ({
      name: t(`yaku.${y.id}.name`),
      value: t('summary.han', { n: y.value }),
      desc: t(`yaku.${y.id}.desc`),
    })),
  ];
  if (s.dora > 0) lines.push({ name: t('summary.dora'), value: t('summary.han', { n: s.dora }) });
  if (s.aka > 0) lines.push({ name: t('summary.aka'), value: t('summary.han', { n: s.aka }) });
  if (s.ura > 0) lines.push({ name: t('summary.ura'), value: t('summary.han', { n: s.ura }) });
  if (s.kita > 0) lines.push({ name: t('summary.kita'), value: t('summary.han', { n: s.kita }) });

  const lineCount = lines.length;
  const totalAt = YAKU_START_MS + lineCount * YAKU_STEP_MS + 200;
  const stampAt = totalAt + 500;
  const points = win.deltas[win.seat] ?? 0;
  const shown = useCountUp(0, points, 900, instant ? 0 : stampAt, true);

  useEffect(() => {
    if (instant) return;
    const timers = Array.from({ length: lineCount }, (_, i) =>
      globalThis.setTimeout(() => play('click'), YAKU_START_MS + i * YAKU_STEP_MS),
    );
    timers.push(globalThis.setTimeout(() => play('stamp'), stampAt));
    return () => timers.forEach((id) => globalThis.clearTimeout(id));
  }, [instant, lineCount, stampAt]);

  const limit = s.yakumanMultiplier > 0 ? 'yakuman' : s.limit;
  const limitName = s.kazoe
    ? t('summary.kazoe')
    : limit !== 'none'
      ? t(`summary.limit.${limit}`)
      : null;
  const scoreLine =
    s.yakumanMultiplier > 0
      ? null
      : `${t('summary.han', { n: s.han })} · ${t('summary.fu', { n: s.fu })}`;
  const delay = (ms: number) => ({ '--d': `${instant ? 0 : ms}ms` }) as CSSProperties;

  return (
    <div
      className={`${styles.panel} ${instant ? styles.instant : ''}`}
      onClick={instant ? undefined : onSkip}
    >
      <header className={styles.winHeader}>
        <PlayerPortrait
          seat={seats[win.seat]}
          name={seatName(seats, win.seat)}
          className={styles.portrait}
        />
        <div>
          <h2 className={styles.winName}>{seatName(seats, win.seat)}</h2>
          <p className={styles.winHow}>
            {win.winType === 'tsumo' ? t('summary.tsumo') : t('summary.ron')}
            {win.from !== null && ` · ${t('summary.from', { name: seatName(seats, win.from) })}`}
          </p>
        </div>
        <div className={styles.indicators}>
          <span className={styles.small}>{t('table.dora')}</span>
          {summary.doraIndicators.map((x) => (
            <Tile key={x.id} tile={x} width={30} />
          ))}
          {summary.uraIndicators.length > 0 && (
            <>
              <span className={styles.small}>{t('summary.uraIndicators')}</span>
              {summary.uraIndicators.map((x) => (
                <Tile key={x.id} tile={x} width={30} />
              ))}
            </>
          )}
        </div>
      </header>

      <div className={styles.hand}>
        {hand.map((tile, i) => (
          <span key={tile.id} className={styles.flip} style={delay(i * 45)}>
            <Tile tile={tile} width={52} />
          </span>
        ))}
        <span className={`${styles.flip} ${styles.winTile}`} style={delay(hand.length * 45 + 200)}>
          <Tile tile={win.winTile} width={52} glow />
        </span>
        {win.melds.map((m, i) => (
          <span
            key={i}
            className={`${styles.flip} ${styles.meld}`}
            style={delay(hand.length * 45 + 300)}
          >
            {m.tiles.map((tile, j) => (
              <Tile
                key={tile.id}
                tile={m.type === 'ankan' && (j === 0 || j === 3) ? null : tile}
                width={40}
              />
            ))}
          </span>
        ))}
      </div>

      <div className={styles.body}>
        <ul className={styles.yaku}>
          {lines.map((l, i) => (
            <li
              key={l.name}
              className={styles.yakuLine}
              style={delay(YAKU_START_MS + i * YAKU_STEP_MS)}
              title={l.desc}
            >
              <span>{l.name}</span>
              <span className={styles.han}>{l.value}</span>
            </li>
          ))}
        </ul>
        <div className={styles.total}>
          {scoreLine && (
            <p className={styles.scoreLine} style={delay(totalAt)}>
              {scoreLine}
            </p>
          )}
          {limitName && (
            <div className={styles.stamp} style={delay(stampAt)}>
              <span className={styles.stampGlyph}>{LIMIT_GLYPH[limit] ?? '和'}</span>
              <span className={styles.stampWord}>{limitName}</span>
            </div>
          )}
          <p className={styles.points} style={delay(stampAt)}>
            {t('summary.points', { n: shown.toLocaleString('pt-BR') })}
          </p>
          {win.pao !== null && (
            <p className={styles.small}>{t('summary.pao', { name: seatName(seats, win.pao) })}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        className={styles.next}
        style={delay(stampAt + 700)}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function DrawStep({
  summary,
  seats,
  onNext,
}: {
  summary: HandSummary;
  seats: readonly SeatSetup[];
  onNext: () => void;
}) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.drawTitle}>
        {summary.kind === 'exhaustive'
          ? t('summary.exhaustive')
          : `${t('summary.abortive')}: ${t(`summary.abortive.${summary.abortiveReason ?? 'kyuushuKyuuhai'}`)}`}
      </h2>
      {summary.nagashi.length > 0 && (
        <p className={styles.note}>
          {t('summary.nagashi')}: {summary.nagashi.map((s) => seatName(seats, s)).join(', ')}
        </p>
      )}
      {summary.tenpai && (
        <ul className={styles.tenpai}>
          {summary.tenpai.map((isTenpai, seat) => (
            <li key={seat}>
              <span className={styles.tenpaiName}>{seatName(seats, seat as Seat)}</span>
              <span className={isTenpai ? styles.tenpaiYes : styles.tenpaiNo}>
                {t(isTenpai ? 'summary.tenpai' : 'summary.noten')}
              </span>
              <span className={styles.tenpaiHand}>
                {isTenpai &&
                  [...(summary.revealed[seat as Seat] ?? [])]
                    .sort(compareTiles)
                    .map((tile) => <Tile key={tile.id} tile={tile} width={30} />)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={`${styles.next} ${styles.visible}`} onClick={onNext}>
        {t('summary.continue')}
      </button>
    </div>
  );
}

/** Centro de cada assento no palco 1600×900 (para o voo dos pontos). */
const SIDE_POS: Record<number, { x: number; y: number }> = {
  0: { x: 800, y: 690 },
  1: { x: 1270, y: 450 },
  2: { x: 800, y: 215 },
  3: { x: 330, y: 450 },
};

function ScorePlaque({
  seat,
  side,
  name,
  before,
  delta,
  instant,
  rank,
}: {
  seat: Seat;
  side: number;
  name: string;
  before: number;
  delta: number;
  instant: boolean;
  rank: number;
}) {
  const value = useCountUp(before, before + delta, COUNT_MS, instant ? 0 : COUNT_DELAY_MS, true);
  return (
    <div className={`${styles.plaque} ${styles[`plaque${side}`]}`} data-seat={seat}>
      <span className={styles.rank}>{['一', '二', '三', '四'][rank]}</span>
      <span className={styles.plaqueName}>{name}</span>
      <span className={styles.plaqueScore}>{value.toLocaleString('pt-BR')}</span>
      {delta !== 0 && (
        <span
          className={delta > 0 ? styles.deltaPlus : styles.deltaMinus}
          style={{ '--d': `${instant ? 0 : 450}ms` } as CSSProperties}
        >
          {signed(delta)}
        </span>
      )}
    </div>
  );
}

function ScoresStep({
  summary,
  seats,
  localSeat,
  canContinue,
  onContinue,
}: {
  summary: HandSummary;
  seats: readonly SeatSetup[];
  localSeat: Seat;
  canContinue: boolean;
  onContinue: () => void;
}) {
  const [instant, setInstant] = useState(false);
  const n = summary.scoresAfter.length;
  const sideOf = (seat: number) => relativeSide(seat as Seat, localSeat, n);
  const ranking = useMemo(
    () =>
      summary.scoresAfter
        .map((_, i) => i)
        .sort((a, b) => (summary.scoresAfter[b] ?? 0) - (summary.scoresAfter[a] ?? 0) || a - b),
    [summary.scoresAfter],
  );

  // Pontos voando de quem paga para quem recebe (proporcional ao valor).
  const flows = useMemo(() => {
    const out: { from: number; to: number; count: number }[] = [];
    const payers = summary.deltas.map((d, i) => ({ d, i })).filter((x) => x.d < 0);
    const receivers = summary.deltas.map((d, i) => ({ d, i })).filter((x) => x.d > 0);
    for (const p of payers)
      for (const r of receivers)
        out.push({ from: p.i, to: r.i, count: Math.min(10, 4 + Math.round(-p.d / 2000)) });
    return out;
  }, [summary.deltas]);

  useEffect(() => {
    if (instant) return;
    const ticks: ReturnType<typeof setTimeout>[] = [];
    if (flows.length > 0) ticks.push(globalThis.setTimeout(() => play('whoosh'), 350));
    for (let i = 0; i < 8; i++)
      ticks.push(
        globalThis.setTimeout(() => play('scoreTick'), COUNT_DELAY_MS + i * (COUNT_MS / 8)),
      );
    return () => ticks.forEach((id) => globalThis.clearTimeout(id));
  }, [instant, flows.length]);

  return (
    <div
      className={`${styles.board} ${instant ? styles.instant : ''}`}
      onClick={() => setInstant(true)}
    >
      <div className={styles.compass} aria-hidden="true">
        <span className={styles.compassGlyph}>{windKanji(summary.roundWind)}</span>
        <span className={styles.compassText}>
          {windName(summary.roundWind)} {summary.handNumber}
        </span>
      </div>
      {flows.flatMap((f) =>
        Array.from({ length: f.count }, (_, k) => {
          const a = SIDE_POS[sideOf(f.from)] ?? ORIGIN;
          const b = SIDE_POS[sideOf(f.to)] ?? ORIGIN;
          return (
            <span
              key={`${f.from}-${f.to}-${k}`}
              className={styles.coin}
              style={
                {
                  left: a.x,
                  top: a.y,
                  '--dx': `${b.x - a.x}px`,
                  '--dy': `${b.y - a.y}px`,
                  '--d': `${instant ? 0 : 300 + k * 70}ms`,
                } as CSSProperties
              }
            />
          );
        }),
      )}
      {summary.scoresAfter.map((after, seat) => (
        <ScorePlaque
          key={seat}
          seat={seat as Seat}
          side={sideOf(seat)}
          name={seatName(seats, seat as Seat)}
          before={summary.scoresBefore[seat] ?? after}
          delta={summary.deltas[seat] ?? 0}
          instant={instant}
          rank={ranking.indexOf(seat)}
        />
      ))}
      <button
        type="button"
        className={`${styles.next} ${styles.boardNext}`}
        style={{ '--d': `${instant ? 0 : COUNT_DELAY_MS + COUNT_MS}ms` } as CSSProperties}
        disabled={!canContinue}
        onClick={(e) => {
          e.stopPropagation();
          onContinue();
        }}
        autoFocus
      >
        {t('summary.continue')}
      </button>
    </div>
  );
}

export function RoundResult({
  summary,
  seats,
  localSeat,
  canContinue,
  onContinue,
}: {
  summary: HandSummary;
  seats: readonly SeatSetup[];
  localSeat: Seat;
  canContinue: boolean;
  onContinue: () => void;
}) {
  const steps = useMemo(() => stepsOf(summary), [summary]);
  const [index, setIndex] = useState(0);
  const [instant, setInstant] = useState(false);
  const step = steps[Math.min(index, steps.length - 1)] ?? { kind: 'scores' };
  // Estável entre renderizações: o anúncio usa isto num temporizador.
  const next = useCallback(() => {
    setInstant(false);
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);
  const currentWin = step.kind === 'win' ? summary.wins[step.index] : undefined;
  const lastWin =
    summary.kind === 'win' && step.kind === 'win' && step.index === summary.wins.length - 1;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={t('summary.continue')}
    >
      {step.kind === 'announce' && (
        <Announce summary={summary} seats={seats} localSeat={localSeat} onDone={next} />
      )}
      {step.kind === 'win' && currentWin && (
        <WinStep
          key={step.index}
          win={currentWin}
          summary={summary}
          seats={seats}
          instant={instant}
          onSkip={() => setInstant(true)}
          onNext={next}
          nextLabel={lastWin ? t('summary.continue') : t('summary.nextWin')}
        />
      )}
      {step.kind === 'draw' && <DrawStep summary={summary} seats={seats} onNext={next} />}
      {step.kind === 'scores' && (
        <ScoresStep
          summary={summary}
          seats={seats}
          localSeat={localSeat}
          canContinue={canContinue}
          onContinue={onContinue}
        />
      )}
    </div>
  );
}
