/** Peças do plano da mesa: rio de descartes, grupos expostos, mão virada e painel central. */
import type { DiscardEntry, Meld, PlayerView, PublicPlayerView, Seat } from '../../engine';
import { t } from '../../i18n';
import { Tile } from '../components/Tile';
import { NUMBER_KANJI, relativeSide, windKanji, windName } from './labels';
import styles from './Table.module.css';

export const POND_TILE = 32;

/** Rio: 6 por fileira nas duas primeiras, o resto na terceira; riichi deitado; chamada esmaecida. */
export function Pond({
  discards,
  lastId,
}: {
  discards: readonly DiscardEntry[];
  lastId: number | null;
}) {
  const rows = [discards.slice(0, 6), discards.slice(6, 12), discards.slice(12)];
  return (
    <div className={styles.pond}>
      {rows.map((row, r) => (
        <div key={r} className={styles.pondRow}>
          {row.map((d) => (
            <Tile
              key={d.tile.id}
              tile={d.tile}
              width={POND_TILE}
              sideways={d.riichi}
              dimmed={d.calledBy !== null}
              className={`${d.tsumogiri ? styles.tsumogiri : ''} ${d.tile.id === lastId ? styles.lastDiscard : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grupo exposto; a peça chamada fica deitada do lado de quem a deu. */
export function MeldView({
  meld,
  owner,
  players,
  width,
}: {
  meld: Meld;
  owner: Seat;
  players: number;
  width: number;
}) {
  if (meld.type === 'ankan') {
    return (
      <span className={styles.meld}>
        {meld.tiles.map((tile, i) => (
          <Tile key={tile.id} tile={i === 0 || i === 3 ? null : tile} width={width} />
        ))}
      </span>
    );
  }
  const from = relativeSide(meld.from, owner, players); // 1 direita, 2 frente, 3 esquerda
  const others = meld.tiles.filter(
    (x) => x.id !== meld.called.id && (meld.type !== 'kakan' || x.id !== meld.added.id),
  );
  const calledIndex = from === 3 ? 0 : from === 2 ? 1 : others.length;
  const ordered = [...others];
  ordered.splice(calledIndex, 0, meld.called);
  return (
    <span className={styles.meld}>
      {ordered.map((tile) =>
        tile.id === meld.called.id ? (
          <span key={tile.id} className={styles.calledStack}>
            {meld.type === 'kakan' && <Tile tile={meld.added} width={width} sideways />}
            <Tile tile={tile} width={width} sideways />
          </span>
        ) : (
          <Tile key={tile.id} tile={tile} width={width} />
        ),
      )}
    </span>
  );
}

export function Melds({
  player,
  players,
  width,
}: {
  player: PublicPlayerView;
  players: number;
  width: number;
}) {
  return (
    <div className={styles.melds}>
      {player.kita.map((k) => (
        <Tile key={k.id} tile={k} width={width} />
      ))}
      {[...player.melds].reverse().map((m, i) => (
        <MeldView key={i} meld={m} owner={player.seat} players={players} width={width} />
      ))}
    </div>
  );
}

export function HiddenHand({ count, width }: { count: number; width: number }) {
  return (
    <div className={styles.hiddenHand}>
      {Array.from({ length: count }, (_, i) => (
        <Tile key={i} tile={null} width={width} />
      ))}
    </div>
  );
}

/**
 * Painel central octogonal: rodada, honba, bastões, peças restantes e, em cada lado, o vento e os
 * pontos do assento. O lado de quem joga acende (indicação de vez).
 */
export function CenterPanel({ view }: { view: PlayerView }) {
  const n = view.rules.players;
  return (
    <div
      className={styles.center}
      aria-label={t('table.round', { wind: windName(view.roundWind), n: view.handNumber })}
    >
      <div className={styles.centerRing} />
      <div className={styles.centerCore}>
        <div className={styles.centerKanji} aria-hidden="true">
          {windKanji(view.roundWind)}
          {NUMBER_KANJI[view.handNumber - 1]}局
        </div>
        <div className={styles.centerRound}>
          {windName(view.roundWind)} {view.handNumber}
        </div>
        <div className={styles.centerCounters}>
          <span title={t('table.honba', { n: view.honba })}>
            <i className={styles.honbaIcon} />
            {view.honba}
          </span>
          <span title={t('table.sticks', { n: view.riichiSticks })}>
            <i className={styles.stickIcon} />
            {view.riichiSticks}
          </span>
        </div>
        <div className={styles.centerWall}>{t('table.wall', { n: view.wallRemaining })}</div>
      </div>
      {view.players.map((p) => {
        const side = relativeSide(p.seat, view.seat, n);
        const isTurn = view.turn === p.seat;
        return (
          <div
            key={p.seat}
            className={`${styles.centerSide} ${styles[`side${side}`]} ${isTurn ? styles.centerTurn : ''}`}
          >
            <span className={styles.turnLight} />
            <span
              className={p.isDealer ? styles.dealerWind : styles.wind}
              title={windName(p.seatWind)}
            >
              {windKanji(p.seatWind)}
            </span>
            <span className={styles.centerScore}>{p.score}</span>
            {p.riichi?.established && (
              <span className={styles.riichiStick} aria-label={t('table.riichi')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
