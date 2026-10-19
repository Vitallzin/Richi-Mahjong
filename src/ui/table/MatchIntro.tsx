/**
 * Apresentação antes de jogar (pedido do desenvolvedor): rodada, modo e tempo no centro e cada jogador
 * entrando pelo seu lado da mesa, com vento, dealer, pontos e o jeito de jogar do personagem. Aparece
 * numa partida nova e ao continuar uma partida salva. A partida fica pausada enquanto ela está aberta.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { play } from '../../audio/sounds';
import type { PlayerView, Seat } from '../../engine';
import { t, tKey } from '../../i18n';
import type { MatchSession } from '../../session';
import { relativeSide, seatName, windKanji, windName, NUMBER_KANJI } from './labels';
import styles from './MatchIntro.module.css';

/** Fecha sozinha depois deste tempo (clicar ou Enter pula). */
export const INTRO_MS = 5200;
const CARD_STEP_MS = 260;

export function MatchIntro({
  view,
  session,
  resumed,
  onDone,
}: {
  view: PlayerView;
  session: MatchSession;
  resumed: boolean;
  onDone: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    play('roundStart');
    const n = view.players.length;
    const ids = [
      ...Array.from({ length: n }, (_, i) =>
        globalThis.setTimeout(() => play('stamp'), 500 + i * CARD_STEP_MS),
      ),
      globalThis.setTimeout(onDone, INTRO_MS),
    ];
    return () => ids.forEach((id) => globalThis.clearTimeout(id));
    // Só na montagem: a intro tem duração fixa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = view.rules.players;
  const timer = session.settings.timer;
  const details = [
    t(`setup.mode.${view.rules.mode}`),
    tKey(`rules.length.${view.rules.length}`),
    timer.mode === 'unlimited'
      ? t('setup.timer.unlimited')
      : `${timer.baseSeconds}+${timer.bankSeconds}`,
  ];
  // Ordem de entrada: você primeiro, depois na ordem da mesa.
  const order = [...view.players].sort(
    (a, b) => relativeSide(a.seat, view.seat, n) - relativeSide(b.seat, view.seat, n),
  );

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      onClick={onDone}
    >
      <div className={styles.rays} aria-hidden="true" />
      <div className={styles.center}>
        <span className={styles.kicker}>{resumed ? t('intro.resumed') : t('intro.newMatch')}</span>
        <span className={styles.seal} aria-hidden="true">
          {windKanji(view.roundWind)}
          {NUMBER_KANJI[view.handNumber - 1]}局
        </span>
        <h2 id="intro-title" className={styles.title}>
          {windName(view.roundWind)} {view.handNumber}
        </h2>
        <p className={styles.details}>{details.join(' · ')}</p>
        {(view.honba > 0 || view.riichiSticks > 0) && (
          <p className={styles.details}>
            {t('table.honba', { n: view.honba })} · {t('table.sticks', { n: view.riichiSticks })}
          </p>
        )}
        <button
          ref={button}
          type="button"
          className={styles.start}
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
        >
          {resumed ? t('intro.continue') : t('intro.start')}
        </button>
      </div>

      {order.map((p, i) => {
        const side = relativeSide(p.seat, view.seat, n);
        const setup = session.seats[p.seat];
        const bot = setup?.kind === 'bot' ? setup.characterId : null;
        const name = seatName(session.seats, p.seat as Seat);
        return (
          <article
            key={p.seat}
            className={`${styles.card} ${styles[`side${side}`]} ${p.isDealer ? styles.dealer : ''}`}
            style={{ '--d': `${300 + i * CARD_STEP_MS}ms` } as CSSProperties}
          >
            <span className={styles.wind} aria-hidden="true">
              {windKanji(p.seatWind)}
            </span>
            <span className={styles.portrait} aria-hidden="true">
              {name.slice(0, 1)}
            </span>
            <div className={styles.info}>
              <strong className={styles.name}>{name}</strong>
              <span className={styles.meta}>
                {windName(p.seatWind)}
                {p.isDealer ? ` · ${t('table.dealer')}` : ''} · {p.score.toLocaleString('pt-BR')}
              </span>
              {bot ? (
                <>
                  <span className={styles.tag}>{t(`characters.${bot}.tag`)}</span>
                  <q className={styles.quote}>{t(`characters.${bot}.quote`)}</q>
                </>
              ) : (
                <span className={styles.tag}>{t('intro.you')}</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
