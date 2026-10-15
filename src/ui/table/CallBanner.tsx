/**
 * Anúncio das chamadas junto de quem chamou: hanzi grande em selo de cinábrio + nome da jogada.
 * Remonta a cada atualização (chave = tick); a animação some sozinha e não bloqueia cliques.
 */
import type { PlayerEvent, Seat } from '../../engine';
import { t } from '../../i18n';
import styles from './CallBanner.module.css';
import { relativeSide } from './labels';

type CallKind = 'chi' | 'pon' | 'kan' | 'riichi' | 'kita';

const GLYPH: Record<CallKind, string> = {
  chi: '吃',
  pon: '碰',
  kan: '杠',
  riichi: '立直',
  kita: '北',
};
const LABEL: Record<CallKind, () => string> = {
  chi: () => t('action.chi'),
  pon: () => t('action.pon'),
  kan: () => t('action.kan'),
  riichi: () => t('action.riichi'),
  kita: () => t('action.kita'),
};

function callsOf(events: readonly PlayerEvent[]): { seat: Seat; kind: CallKind }[] {
  const out: { seat: Seat; kind: CallKind }[] = [];
  for (const e of events) {
    if (e.type === 'CallMade') {
      const kind = e.meld.type === 'chi' ? 'chi' : e.meld.type === 'pon' ? 'pon' : 'kan';
      out.push({ seat: e.seat, kind });
    } else if (e.type === 'TileDiscarded' && e.riichi) {
      out.push({ seat: e.seat, kind: 'riichi' });
    } else if (e.type === 'KitaDeclared') {
      out.push({ seat: e.seat, kind: 'kita' });
    }
  }
  return out;
}

export function CallBanner({
  events,
  tick,
  localSeat,
  players,
}: {
  events: readonly PlayerEvent[];
  tick: number;
  localSeat: Seat;
  players: number;
}) {
  const calls = callsOf(events);
  if (calls.length === 0) return null;
  return (
    <>
      {calls.map((c, i) => (
        <div
          key={`${tick}-${i}`}
          className={`${styles.banner} ${styles[`side${relativeSide(c.seat, localSeat, players)}`]} ${c.kind === 'riichi' ? styles.riichi : ''}`}
          aria-hidden="true"
        >
          <span className={styles.seal}>{GLYPH[c.kind]}</span>
          <span className={styles.word}>{LABEL[c.kind]()}</span>
        </div>
      ))}
    </>
  );
}
