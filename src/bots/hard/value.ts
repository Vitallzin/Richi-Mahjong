/**
 * Valor esperado das esperas (Difícil): para uma mão de 13 peças em tenpai, quantas peças vencem
 * (descontando as visíveis) e quanto cada vitória vale, com e sem riichi. Só PlayerView.
 */
import {
  meetsHanMinimum,
  scoreHand,
  shanten,
  toCounts,
  visibleCounts,
  waits,
  type PlayerView,
  type Tile,
  type TileKind,
  type WinInput,
} from '../../engine';

export interface WaitValue {
  readonly kind: TileKind;
  /** Cópias que o bot não vê (muro ou mãos alheias). */
  readonly remaining: number;
  /** Pontos aproximados de um ron (0 = sem yaku). */
  readonly ron: number;
  /** Com riichi (mão fechada), mesmo sem outro yaku. */
  readonly ronWithRiichi: number;
}

export interface TenpaiInfo {
  readonly waits: readonly WaitValue[];
  readonly remaining: number;
  /** Soma de remaining × pontos sem riichi (dama). */
  readonly damaEv: number;
  /** Soma de remaining × pontos com riichi. */
  readonly riichiEv: number;
  readonly closed: boolean;
}

const phantom = (kind: TileKind): Tile => ({ id: -1 - kind, kind, red: false });

function points(
  view: PlayerView,
  concealed: readonly Tile[],
  kind: TileKind,
  riichi: boolean,
): number {
  const me = view.players[view.seat];
  if (!me) return 0;
  const tile = phantom(kind);
  const input: WinInput = {
    winType: 'ron',
    seatWind: me.seatWind,
    roundWind: view.roundWind,
    isDealer: me.isDealer,
    riichi: me.riichi?.established
      ? me.riichi.double
        ? 'double'
        : 'riichi'
      : riichi
        ? 'riichi'
        : 'none',
    ippatsu: false,
    haitei: false,
    houtei: false,
    rinshan: false,
    chankan: false,
    tenhou: false,
    chiihou: false,
    concealed: [...concealed, tile],
    melds: me.melds,
    winTile: tile,
    doraIndicators: view.doraIndicators.map((t) => t.kind),
    uraIndicators: [],
    kitaCount: me.kita.length,
    rules: view.rules,
  };
  const scored = scoreHand(input);
  if (!scored || !meetsHanMinimum(scored, view.rules.hanMinimum)) return 0;
  return scored.base * (me.isDealer ? 6 : 4);
}

/** Informações de tenpai da mão `hand` (13 peças + grupos); null se não está em tenpai. */
export function tenpaiInfo(view: PlayerView, hand: readonly Tile[]): TenpaiInfo | null {
  const me = view.players[view.seat];
  const melds = me?.melds.length ?? 0;
  const counts = toCounts(hand);
  if (shanten(counts, melds) !== 0) return null;
  const kinds = waits(counts, melds);
  if (kinds.length === 0) return null;
  const visible = visibleCounts(view);
  const closed = (me?.melds ?? []).every((m) => m.type === 'ankan');
  const list: WaitValue[] = kinds.map((kind) => {
    const remaining = Math.max(0, 4 - (visible[kind] ?? 0));
    const ron = points(view, hand, kind, false);
    const ronWithRiichi = closed ? points(view, hand, kind, true) : ron;
    return { kind, remaining, ron, ronWithRiichi };
  });
  return {
    waits: list,
    remaining: list.reduce((a, w) => a + w.remaining, 0),
    damaEv: list.reduce((a, w) => a + w.remaining * w.ron, 0),
    riichiEv: list.reduce((a, w) => a + w.remaining * w.ronWithRiichi, 0),
    closed,
  };
}
