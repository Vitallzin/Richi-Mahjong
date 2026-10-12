/**
 * Análises de mão para bots, só com informação da PlayerView: peças visíveis, eficiência (ukeire),
 * caminhos de yaku ao chamar e perigo de descartes diante de riichi.
 */
import {
  CHUN,
  doraFromIndicator,
  HAKU,
  isHonor,
  isSimple,
  isTerminal,
  isWind,
  KIND_COUNT,
  shanten,
  toCounts,
  type PlayerView,
  type Seat,
  type Tile,
  type TileKind,
  visibleCounts,
} from '../engine';

export const meldCountOf = (view: PlayerView): number => view.players[view.seat]?.melds.length ?? 0;

export interface DiscardOption {
  readonly tile: Tile;
  readonly shanten: number;
  /** Peças não visíveis que reduzem o shanten após o descarte. */
  readonly ukeire: number;
}

/** Ukeire de uma mão de 3n+1 peças com shanten `s`. */
export function ukeire(
  counts: number[],
  melds: number,
  s: number,
  visible: readonly number[],
): number {
  let total = 0;
  for (let k = 0; k < KIND_COUNT; k++) {
    const remaining = 4 - (visible[k] as number);
    if (remaining <= 0 || (counts[k] as number) >= 4) continue;
    counts[k] = (counts[k] as number) + 1;
    if (shanten(counts, melds) < s) total += remaining;
    counts[k] = (counts[k] as number) - 1;
  }
  return total;
}

/**
 * Avalia cada descarte candidato (um por tipo/vermelho). O ukeire só é calculado para os de menor
 * shanten, para caber no orçamento de tempo (spec 8.4).
 */
export function evaluateDiscards(view: PlayerView, candidates: readonly Tile[]): DiscardOption[] {
  const melds = meldCountOf(view);
  const counts = toCounts(view.hand);
  const visible = visibleCounts(view);
  const unique = new Map<string, Tile>();
  for (const t of candidates) unique.set(`${t.kind}:${t.red}`, t);
  const scored = [...unique.values()].map((tile) => {
    counts[tile.kind] = (counts[tile.kind] as number) - 1;
    const s = shanten(counts, melds);
    counts[tile.kind] = (counts[tile.kind] as number) + 1;
    return { tile, shanten: s, ukeire: 0 };
  });
  const best = Math.min(...scored.map((o) => o.shanten));
  return scored.map((o) => {
    if (o.shanten !== best) return o;
    counts[o.tile.kind] = (counts[o.tile.kind] as number) - 1;
    const u = ukeire(counts, melds, o.shanten, visible);
    counts[o.tile.kind] = (counts[o.tile.kind] as number) + 1;
    return { ...o, ukeire: u };
  });
}

export const doraKinds = (view: PlayerView): TileKind[] =>
  view.doraIndicators.map((t) => doraFromIndicator(t.kind, view.rules.mode));

/** Valor heurístico de manter a peça: dora, vermelha, honra com valor. */
export function tileValue(view: PlayerView, tile: Tile): number {
  let v = 0;
  for (const d of doraKinds(view)) if (d === tile.kind) v += 1;
  if (tile.red) v += 1;
  if (isValuedHonor(view, tile.kind)) v += 0.5;
  return v;
}

export function isValuedHonor(view: PlayerView, kind: TileKind): boolean {
  if (kind >= HAKU && kind <= CHUN) return true;
  const me = view.players[view.seat];
  return isWind(kind) && (kind === view.roundWind || kind === me?.seatWind);
}

/** A mão teria um yaku "aberto" garantido ou provável depois de chamar? (spec 8.2, Normal) */
export function hasOpenYakuPath(view: PlayerView, extraKinds: readonly TileKind[]): boolean {
  const me = view.players[view.seat];
  const all = [
    ...view.hand.map((t) => t.kind),
    ...extraKinds,
    ...(me?.melds.flatMap((m) => m.tiles.map((t) => t.kind)) ?? []),
  ];
  const counts = toCounts(all.map((kind) => ({ kind })));
  // Yakuhai: trinca (ou pon) de honra com valor.
  for (let k = 27; k < KIND_COUNT; k++) {
    if ((counts[k] as number) >= 3 && isValuedHonor(view, k)) return true;
  }
  // Tanyao aberto: tudo simples (permitido pela regra kuitan).
  if (view.rules.kuitan && all.every(isSimple)) return true;
  // Honitsu/chinitsu: um naipe só (com ou sem honras).
  const suits = new Set(all.filter((k) => !isHonor(k)).map((k) => Math.floor(k / 9)));
  if (suits.size <= 1 && all.length >= 8) return true;
  return false;
}

/** Assentos adversários com riichi estabelecido. */
export const riichiOpponents = (view: PlayerView): Seat[] =>
  view.players.filter((p) => p.seat !== view.seat && p.riichi?.established).map((p) => p.seat);

/**
 * Perigo de descartar `kind` contra os riichi (0 = seguro). Genbutsu é 0; suji e honras vistas reduzem.
 * `full` liga a leitura mais completa (kabe e terminais), usada nas dificuldades maiores.
 */
export function danger(view: PlayerView, kind: TileKind, full: boolean): number {
  const threats = riichiOpponents(view);
  if (threats.length === 0) return 0;
  const visible = visibleCounts(view);
  let worst = 0;
  for (const seat of threats) {
    const discards = view.players[seat]?.discards ?? [];
    const genbutsu = new Set(discards.map((d) => d.tile.kind));
    if (genbutsu.has(kind)) continue;
    let d: number;
    if (isHonor(kind)) {
      const seen = visible[kind] as number;
      d = seen >= 3 ? 0.5 : seen === 2 ? 2 : 4;
    } else {
      const n = kind % 9;
      const suji = (k: number) =>
        k >= 0 && Math.floor(k / 9) === Math.floor(kind / 9) && genbutsu.has(k);
      const sujiSafe =
        n < 3 ? suji(kind + 3) : n > 5 ? suji(kind - 3) : suji(kind - 3) && suji(kind + 3);
      d = sujiSafe ? 3 : 8;
      if (full && isTerminal(kind)) d -= 2;
      if (full) {
        // Kabe: todas as 4 cópias de um vizinho visíveis tornam algumas esperas impossíveis.
        const left = n >= 1 ? (visible[kind - 1] as number) : 0;
        const right = n <= 7 ? (visible[kind + 1] as number) : 0;
        if (left >= 4 || right >= 4) d -= 2;
      }
    }
    worst = Math.max(worst, d);
  }
  return Math.max(0, worst);
}
