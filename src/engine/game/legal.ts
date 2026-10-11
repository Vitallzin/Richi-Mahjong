/**
 * Ações legais por assento (spec 7.4–7.8). A UI só oferece o que está aqui; o motor rejeita o resto.
 */
import { regularDecompositions, waits } from '../hand';
import { isHonor, isYaochu, NORTH, suitOf, toCounts, type Tile, type TileKind } from '../tiles';
import type { Seat } from '../types';
import type { CallOptions, LegalActions, MatchState, PlayerState } from './types';
import {
  evaluateWin,
  isClosedHand,
  isFuriten,
  kanCount,
  nextSeat,
  playerCount,
  playerOf,
  requireHand,
  seatsAfter,
  tsumoFlags,
} from './util';

export const NO_ACTIONS: LegalActions = Object.freeze({
  discard: [],
  riichi: [],
  tsumo: false,
  ron: false,
  chi: [],
  pon: [],
  daiminkan: false,
  ankan: [],
  kakan: [],
  kita: false,
  kyuushuKyuuhai: false,
  pass: false,
  ackSummary: false,
});

const tilesOfKind = (hand: readonly Tile[], kind: TileKind): Tile[] =>
  hand.filter((t) => t.kind === kind);

/** Uma peça representante por variante (vermelha / normal) de um tipo. */
function variants(hand: readonly Tile[], kind: TileKind): Tile[] {
  const tiles = tilesOfKind(hand, kind);
  const out: Tile[] = [];
  const red = tiles.find((t) => t.red);
  const normal = tiles.find((t) => !t.red);
  if (red) out.push(red);
  if (normal) out.push(normal);
  return out;
}

/** Pares possíveis para pon, um por combinação distinta de vermelhas. */
function ponPairs(hand: readonly Tile[], kind: TileKind): [Tile, Tile][] {
  const tiles = tilesOfKind(hand, kind);
  const reds = tiles.filter((t) => t.red);
  const normals = tiles.filter((t) => !t.red);
  const out: [Tile, Tile][] = [];
  if (normals.length >= 2) out.push([normals[0] as Tile, normals[1] as Tile]);
  if (reds.length >= 1 && normals.length >= 1) out.push([reds[0] as Tile, normals[0] as Tile]);
  if (reds.length >= 2) out.push([reds[0] as Tile, reds[1] as Tile]);
  return out;
}

/** Tipos proibidos de descartar após uma chamada (kuikae, spec 7.5). */
export function kuikaeKinds(
  called: TileKind,
  use: readonly Tile[],
  type: 'chi' | 'pon',
): TileKind[] {
  if (type === 'pon') return [called];
  const kinds = use.map((t) => t.kind).sort((a, b) => a - b);
  const [a, b] = kinds as [TileKind, TileKind];
  const out = [called];
  // Chamou na ponta: proíbe também a peça do outro extremo (ex.: 4m com 56m ⇒ 4m e 7m).
  if (called < a && b - a === 1 && b % 9 <= 7) out.push(b + 1);
  if (called > b && b - a === 1 && a % 9 >= 1) out.push(a - 1);
  return out;
}

/** Depois de retirar `use`, sobra alguma peça descartável? */
function hasDiscardAfterCall(
  hand: readonly Tile[],
  use: readonly Tile[],
  forbidden: readonly TileKind[],
): boolean {
  const usedIds = new Set(use.map((t) => t.id));
  return hand.some((t) => !usedIds.has(t.id) && !forbidden.includes(t.kind));
}

function chiCombos(hand: readonly Tile[], called: Tile): [Tile, Tile][] {
  const k = called.kind;
  if (isHonor(k)) return [];
  const n = k % 9;
  const patterns: [number, number][] = [];
  if (n >= 2) patterns.push([k - 2, k - 1]);
  if (n >= 1 && n <= 7) patterns.push([k - 1, k + 1]);
  if (n <= 6) patterns.push([k + 1, k + 2]);
  const out: [Tile, Tile][] = [];
  for (const [x, y] of patterns) {
    if (suitOf(x) !== suitOf(k) || suitOf(y) !== suitOf(k)) continue;
    for (const tx of variants(hand, x)) {
      for (const ty of variants(hand, y)) {
        const use: [Tile, Tile] = [tx, ty];
        if (hasDiscardAfterCall(hand, use, kuikaeKinds(k, use, 'chi'))) out.push(use);
      }
    }
  }
  return out;
}

/** Opções de chamada de cada assento sobre um descarte. */
export function computeCallOptions(
  s: MatchState,
  discarder: Seat,
  tile: Tile,
): Partial<Record<Seat, CallOptions>> {
  const h = requireHand(s);
  const n = playerCount(s);
  const out: Partial<Record<Seat, CallOptions>> = {};
  const wallEmpty = h.wall.length === 0;
  for (const seat of seatsAfter(discarder, n)) {
    const p = playerOf(h, seat);
    const ron =
      evaluateWin(s, seat, [...p.hand, tile], tile, { winType: 'ron', houtei: wallEmpty }) !==
        null && !isFuriten(p);
    let pon: [Tile, Tile][] = [];
    let chi: [Tile, Tile][] = [];
    let daiminkan = false;
    if (!p.riichi && !wallEmpty && !h.suukaikanPending) {
      pon = ponPairs(p.hand, tile.kind).filter((use) =>
        hasDiscardAfterCall(p.hand, use, [tile.kind]),
      );
      daiminkan = tilesOfKind(p.hand, tile.kind).length === 3 && kanCount(h) < s.rules.maxKans;
      if (s.rules.chi && seat === nextSeat(discarder, n)) chi = chiCombos(p.hand, tile);
    }
    if (ron || pon.length > 0 || chi.length > 0 || daiminkan) {
      out[seat] = { ron, pon, chi, daiminkan };
    }
  }
  return out;
}

/** O kan fechado (ou kita) em riichi não altera as esperas nem quebra sequência (spec 6.2). */
function riichiKanKeepsWaits(p: PlayerState, kind: TileKind): boolean {
  const drawn = p.drawn;
  if (!drawn || drawn.kind !== kind) return false;
  const before = toCounts(p.hand.filter((t) => t.id !== drawn.id));
  const waitsBefore = waits(before, p.melds.length);
  const after = before.slice();
  after[kind] = (after[kind] as number) - 3;
  const waitsAfter = waits(after, p.melds.length + 1);
  if (waitsBefore.join() !== waitsAfter.join()) return false;
  // Em toda leitura da mão vencedora, as 3 peças precisam formar trinca (nunca sequência).
  return waitsBefore.every((w) => {
    const full = before.slice();
    full[w] = (full[w] as number) + 1;
    return regularDecompositions(full).every((dec) =>
      dec.sets.some((set) => set.type === 'trip' && set.kind === kind),
    );
  });
}

function riichiKitaKeepsWaits(p: PlayerState): boolean {
  const drawn = p.drawn;
  if (!drawn) return false;
  if (drawn.kind === NORTH) return true;
  const north = p.hand.find((t) => t.kind === NORTH);
  if (!north) return false;
  const before = toCounts(p.hand.filter((t) => t.id !== drawn.id));
  const after = toCounts(p.hand.filter((t) => t.id !== north.id));
  return waits(before, p.melds.length).join() === waits(after, p.melds.length).join();
}

function turnActions(s: MatchState, seat: Seat): LegalActions {
  const h = requireHand(s);
  const p = playerOf(h, seat);
  const rules = s.rules;
  const afterCall = h.turnKind === 'call';
  const canKan = !afterCall && h.wall.length > 0 && kanCount(h) < rules.maxKans;

  const discard = p.riichi
    ? p.drawn
      ? [p.drawn]
      : []
    : p.hand.filter((t) => !h.forbiddenDiscards.includes(t.kind));

  const riichi: Tile[] = [];
  if (
    !p.riichi &&
    !afterCall &&
    isClosedHand(p) &&
    (s.scores[seat] as number) >= rules.riichiCost &&
    h.wall.length >= rules.riichiMinWall
  ) {
    const counts = toCounts(p.hand);
    const tenpaiByKind = new Map<TileKind, boolean>();
    for (const t of p.hand) {
      let ok = tenpaiByKind.get(t.kind);
      if (ok === undefined) {
        counts[t.kind] = (counts[t.kind] as number) - 1;
        ok = waits(counts, p.melds.length).length > 0;
        counts[t.kind] = (counts[t.kind] as number) + 1;
        tenpaiByKind.set(t.kind, ok);
      }
      if (ok) riichi.push(t);
    }
  }

  const drawn = p.drawn;
  const tsumo =
    !afterCall &&
    drawn !== null &&
    evaluateWin(s, seat, p.hand, drawn, tsumoFlags(s, seat)) !== null;

  const ankan: TileKind[] = [];
  if (canKan) {
    const counts = toCounts(p.hand);
    counts.forEach((c, kind) => {
      if (c === 4 && (!p.riichi || riichiKanKeepsWaits(p, kind))) ankan.push(kind);
    });
  }

  const kakan: Tile[] = [];
  if (canKan && !p.riichi) {
    for (const meld of p.melds) {
      if (meld.type !== 'pon') continue;
      const tile = p.hand.find((t) => t.kind === meld.called.kind);
      if (tile) kakan.push(tile);
    }
  }

  const kita =
    rules.mode === 'sanma' &&
    rules.nukiDora &&
    !afterCall &&
    h.wall.length > 0 &&
    p.hand.some((t) => t.kind === NORTH) &&
    (!p.riichi || riichiKitaKeepsWaits(p));

  const yaochuKinds = new Set(p.hand.filter((t) => isYaochu(t.kind)).map((t) => t.kind));
  const kyuushuKyuuhai =
    rules.abortive.kyuushuKyuuhai &&
    h.uninterrupted &&
    h.turnKind === 'draw' &&
    p.discards.length === 0 &&
    yaochuKinds.size >= 9;

  return { ...NO_ACTIONS, discard, riichi, tsumo, ankan, kakan, kita, kyuushuKyuuhai };
}

/** Ações legais do assento no estado atual. */
export function getLegalActions(s: MatchState, seat: Seat): LegalActions {
  switch (s.phase) {
    case 'awaitingDiscard':
      return requireHand(s).turn === seat ? turnActions(s, seat) : NO_ACTIONS;
    case 'awaitingCalls': {
      const pc = requireHand(s).pendingCalls;
      const options = pc?.options[seat];
      if (!pc || !options || pc.responses[seat]) return NO_ACTIONS;
      return { ...NO_ACTIONS, ...options, pass: true };
    }
    case 'awaitingRobbery': {
      const pr = requireHand(s).pendingRobbery;
      if (!pr || !pr.eligible.includes(seat) || pr.responses[seat]) return NO_ACTIONS;
      return { ...NO_ACTIONS, ron: true, pass: true };
    }
    case 'handSummary':
      return s.acks[seat] ? NO_ACTIONS : { ...NO_ACTIONS, ackSummary: true };
    case 'matchEnded':
      return NO_ACTIONS;
  }
}

/** Há alguma ação disponível para o assento? */
export const hasAnyAction = (legal: LegalActions): boolean =>
  legal.discard.length > 0 ||
  legal.tsumo ||
  legal.ron ||
  legal.chi.length > 0 ||
  legal.pon.length > 0 ||
  legal.daiminkan ||
  legal.ankan.length > 0 ||
  legal.kakan.length > 0 ||
  legal.kita ||
  legal.kyuushuKyuuhai ||
  legal.pass ||
  legal.ackSummary;

/** Assentos que podem roubar o kakan/ankan/kita (ron), excluindo furiten. */
export function robberyEligible(
  s: MatchState,
  declarer: Seat,
  tile: Tile,
  kind: 'kakan' | 'ankan' | 'kita',
): Seat[] {
  const h = requireHand(s);
  const out: Seat[] = [];
  for (const seat of seatsAfter(declarer, playerCount(s))) {
    const p = playerOf(h, seat);
    if (kind === 'ankan') {
      // Chankan sobre ankan só para kokushi musou (convenção adotada).
      const scored = evaluateWin(s, seat, [...p.hand, tile], tile, {
        winType: 'ron',
        chankan: true,
      });
      if (scored?.yakuman.some((y) => y.id === 'kokushi') && !isFuriten(p)) out.push(seat);
      continue;
    }
    const flags = { winType: 'ron' as const, chankan: kind === 'kakan' };
    if (evaluateWin(s, seat, [...p.hand, tile], tile, flags) && !isFuriten(p)) out.push(seat);
  }
  return out;
}
