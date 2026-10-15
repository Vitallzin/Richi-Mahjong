/**
 * Ajudas de mão (spec 9.2 e 9.3), calculadas só com a PlayerView:
 * shanten em linguagem simples, esperas, cópias não visíveis, No Yaku separado por ron e tsumo,
 * furiten e se existe possibilidade real de vitória. Nunca sugere descarte (spec 9.6).
 */
import {
  isAgari,
  meetsHanMinimum,
  notVisible,
  scoreHand,
  shanten,
  toCounts,
  visibleCounts,
  waits,
  type PlayerView,
  type ScoredHand,
  type Tile,
  type TileKind,
  type WinInput,
  type YakuId,
} from '../engine';

export interface YakuCheck {
  /** Vitória válida: forma completa, ao menos 1 yaku e han mínimo. */
  readonly ok: boolean;
  /** Tem yaku, mas não atinge o han mínimo da regra. */
  readonly belowMinimum: boolean;
  readonly yaku: readonly YakuId[];
  readonly han: number;
  readonly yakuman: boolean;
}

export interface WaitInfo {
  readonly kind: TileKind;
  /** Cópias que você não vê (muro ou mãos dos adversários). */
  readonly notVisible: number;
  readonly ron: YakuCheck;
  readonly tsumo: YakuCheck;
  /** Sem riichi, a mão fechada teria yaku se declarasse riichi. */
  readonly riichiWouldGiveYaku: boolean;
}

/**
 * 'discardToTenpai': mão de 14 peças (sua vez) em que o descarte certo deixa em tenpai — as esperas
 * aparecem ao analisar cada descarte.
 */
export type HandState = 'complete' | 'tenpai' | 'discardToTenpai' | 'notTenpai';

export interface HandAdvice {
  readonly state: HandState;
  /** -1 completa, 0 tenpai, n = peças que faltam para tenpai. */
  readonly shanten: number;
  /** Mão completa de 14 peças: tem yaku agora (tsumo)? */
  readonly completeWithYaku: YakuCheck | null;
  readonly waits: readonly WaitInfo[];
  /** Furiten (atual, ou que existiria após o descarte analisado). */
  readonly furiten: boolean;
  /** Há espera com cópias não visíveis e vitória válida por tsumo, ou por ron sem furiten. */
  readonly realWinPossible: boolean;
}

const NO_CHECK: YakuCheck = { ok: false, belowMinimum: false, yaku: [], han: 0, yakuman: false };

function toCheck(scored: ScoredHand | null, hanMinimum: number): YakuCheck {
  if (!scored) return NO_CHECK;
  const ok = meetsHanMinimum(scored, hanMinimum);
  return {
    ok,
    belowMinimum: !ok,
    yaku: [...scored.yakuman, ...scored.yaku].map((y) => y.id),
    han: scored.han,
    yakuman: scored.yakumanMultiplier > 0,
  };
}

const meOf = (view: PlayerView) => view.players[view.seat];

function winInput(
  view: PlayerView,
  concealed: readonly Tile[],
  winTile: Tile,
  winType: 'ron' | 'tsumo',
  assumeRiichi: boolean,
): WinInput | null {
  const me = meOf(view);
  if (!me) return null;
  const riichi = me.riichi?.established
    ? me.riichi.double
      ? 'double'
      : 'riichi'
    : assumeRiichi
      ? 'riichi'
      : 'none';
  return {
    winType,
    seatWind: me.seatWind,
    roundWind: view.roundWind,
    isDealer: me.isDealer,
    riichi,
    // Situações que o jogador não controla (ippatsu, haitei, rinshan...) ficam de fora: a ajuda
    // responde se a mão tem yaku por si só.
    ippatsu: false,
    haitei: false,
    houtei: false,
    rinshan: false,
    chankan: false,
    tenhou: false,
    chiihou: false,
    concealed,
    melds: me.melds,
    winTile,
    doraIndicators: view.doraIndicators.map((t) => t.kind),
    uraIndicators: [],
    kitaCount: me.kita.length,
    rules: view.rules,
  };
}

const phantom = (kind: TileKind): Tile => ({ id: -1 - kind, kind, red: false });

function check(
  view: PlayerView,
  base: readonly Tile[],
  kind: TileKind,
  winType: 'ron' | 'tsumo',
  assumeRiichi = false,
) {
  const tile = phantom(kind);
  const input = winInput(view, [...base, tile], tile, winType, assumeRiichi);
  return toCheck(input ? scoreHand(input) : null, view.rules.hanMinimum);
}

/**
 * Analisa a mão: a de 13 peças atual, ou a que sobraria descartando `discard` (análise de candidato).
 * Com 14 peças e sem `discard`, diz se a mão está completa.
 */
export function analyzeHand(view: PlayerView, discard: Tile | null = null): HandAdvice {
  const me = meOf(view);
  const melds = me?.melds.length ?? 0;
  const hand = discard ? view.hand.filter((t) => t.id !== discard.id) : [...view.hand];
  const counts = toCounts(hand);
  const s = shanten(counts, melds);
  const closed = (me?.melds ?? []).every((m) => m.type === 'ankan');
  const inRiichi = me?.riichi?.established ?? false;

  if (hand.length % 3 === 2) {
    const complete = isAgari(counts, melds);
    let completeWithYaku: YakuCheck | null = null;
    if (complete && view.drawn) {
      const rest = hand.filter((t) => t.id !== view.drawn?.id);
      const input = winInput(view, [...rest, view.drawn], view.drawn, 'tsumo', false);
      completeWithYaku = toCheck(input ? scoreHand(input) : null, view.rules.hanMinimum);
    }
    return {
      state: complete ? 'complete' : s === 0 ? 'discardToTenpai' : 'notTenpai',
      shanten: s,
      completeWithYaku,
      waits: [],
      furiten: view.furiten,
      realWinPossible: completeWithYaku?.ok ?? false,
    };
  }

  const visible = visibleCounts(view);
  const ownDiscards = new Set((me?.discards ?? []).map((d) => d.tile.kind));
  if (discard) ownDiscards.add(discard.kind);
  const waitKinds = waits(counts, melds);
  const waitInfos: WaitInfo[] = waitKinds.map((kind) => {
    const ron = check(view, hand, kind, 'ron');
    const tsumo = check(view, hand, kind, 'tsumo');
    const riichiWouldGiveYaku =
      closed && !inRiichi && !ron.ok && !tsumo.ok && check(view, hand, kind, 'ron', true).ok;
    return { kind, notVisible: notVisible(visible, kind), ron, tsumo, riichiWouldGiveYaku };
  });
  // Furiten: espera entre os próprios descartes, ou o furiten atual. Descartar limpa o temporário,
  // mas não o de riichi.
  const permanent = waitKinds.some((k) => ownDiscards.has(k));
  const furiten = permanent || (view.furiten && (!discard || inRiichi));
  const realWinPossible = waitInfos.some(
    (w) => w.notVisible > 0 && (w.tsumo.ok || (w.ron.ok && !furiten)),
  );
  return {
    state: waitKinds.length > 0 ? 'tenpai' : 'notTenpai',
    shanten: waitKinds.length > 0 ? 0 : Math.max(1, s),
    completeWithYaku: null,
    waits: waitInfos,
    furiten,
    realWinPossible,
  };
}
