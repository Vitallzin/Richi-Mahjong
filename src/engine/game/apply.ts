/**
 * Máquina de estados da mão (spec 5.2 e 7.4–7.11). `applyAction` é pura: recebe um estado, devolve
 * outro (cópia) e os eventos. Ações ilegais lançam `IllegalActionError` sem alterar nada.
 */
import { CHUN, HAKU, isDragon, isWind, NORTH, type Tile, type TileKind } from '../tiles';
import type { Meld, Seat } from '../types';
import { endAbortive, endExhaustive, endWithWins, type WinCandidate } from './end';
import { illegal } from './errors';
import { computeCallOptions, getLegalActions, kuikaeKinds, robberyEligible } from './legal';
import type {
  Action,
  CallResponse,
  GameEvent,
  HandState,
  LegalActions,
  MatchState,
  PlayerState,
  RobberyKind,
} from './types';
import {
  evaluateWin,
  nextSeat,
  playerCount,
  playerOf,
  removeTileById,
  requireHand,
  seatsAfter,
  tsumoFlags,
} from './util';

interface Ctx {
  readonly s: MatchState;
  readonly h: HandState;
  readonly events: GameEvent[];
}

const sameTile = (a: Tile, b: Tile) => a.id === b.id;
const sameUse = (a: readonly Tile[], b: readonly Tile[]) =>
  a.length === b.length && a.every((t) => b.some((u) => sameTile(t, u)));

/** Aplica a ação do assento. */
export function applyAction(
  state: MatchState,
  seat: Seat,
  action: Action,
): { state: MatchState; events: GameEvent[] } {
  const legal = getLegalActions(state, seat);
  validate(legal, action);
  const s = structuredClone(state);
  const events: GameEvent[] = [];

  if (action.type === 'ackSummary') {
    ack(s, seat, events);
    return { state: s, events };
  }

  const ctx: Ctx = { s, h: requireHand(s), events };
  switch (action.type) {
    case 'discard':
      discard(ctx, seat, action.tile, action.riichi ?? false);
      break;
    case 'tsumo':
      tsumo(ctx, seat);
      break;
    case 'ankan':
      ankan(ctx, seat, action.kind);
      break;
    case 'kakan':
      kakan(ctx, seat, action.tile);
      break;
    case 'kita':
      kita(ctx, seat);
      break;
    case 'kyuushuKyuuhai':
      endAbortive(s, 'kyuushuKyuuhai', events, seat);
      break;
    case 'ron':
    case 'pass':
    case 'pon':
    case 'chi':
    case 'daiminkan':
      if (s.phase === 'awaitingRobbery')
        respondRobbery(ctx, seat, action.type === 'ron' ? 'ron' : 'pass');
      else respondCall(ctx, seat, action);
      break;
  }
  return { state: s, events };
}

function validate(legal: LegalActions, action: Action): void {
  const ok = (() => {
    switch (action.type) {
      case 'discard':
        return action.riichi
          ? legal.riichi.some((t) => sameTile(t, action.tile))
          : legal.discard.some((t) => sameTile(t, action.tile));
      case 'tsumo':
        return legal.tsumo;
      case 'ron':
        return legal.ron;
      case 'chi':
        return legal.chi.some((use) => sameUse(use, action.use));
      case 'pon':
        return legal.pon.some((use) => sameUse(use, action.use));
      case 'daiminkan':
        return legal.daiminkan;
      case 'ankan':
        return legal.ankan.includes(action.kind);
      case 'kakan':
        return legal.kakan.some((t) => sameTile(t, action.tile));
      case 'kita':
        return legal.kita;
      case 'kyuushuKyuuhai':
        return legal.kyuushuKyuuhai;
      case 'pass':
        return legal.pass;
      case 'ackSummary':
        return legal.ackSummary;
    }
  })();
  if (!ok) illegal(`illegal:${action.type}`, `Ação ilegal ou fora de hora: ${action.type}`);
}

function ack(s: MatchState, seat: Seat, events: GameEvent[]): void {
  s.acks[seat] = true;
  if (s.acks.every(Boolean) && s.result) {
    s.phase = 'matchEnded';
    events.push({ type: 'MatchEnded', result: s.result });
  }
}

// ---------------------------------------------------------------------------------------------
// Muro, dora e utilidades de turno

function revealPendingDora(ctx: Ctx): void {
  while (ctx.h.pendingDora > 0) {
    ctx.h.pendingDora -= 1;
    revealDora(ctx);
  }
}

function revealDora(ctx: Ctx): void {
  const { h, events } = ctx;
  if (h.doraRevealed >= h.doraIndicators.length) return;
  events.push({ type: 'DoraRevealed', indicator: h.doraIndicators[h.doraRevealed] as Tile });
  h.doraRevealed += 1;
}

function breakIppatsu(h: HandState): void {
  for (const p of h.players) if (p.riichi) p.riichi.ippatsu = false;
}

function draw(ctx: Ctx, seat: Seat): void {
  const { s, h, events } = ctx;
  const tile = h.wall.shift();
  if (!tile) throw new Error('Compra com o muro vazio');
  const p = playerOf(h, seat);
  p.hand.push(tile);
  p.drawn = tile;
  h.turn = seat;
  h.turnKind = 'draw';
  h.forbiddenDiscards = [];
  s.phase = 'awaitingDiscard';
  events.push({ type: 'TileDrawn', seat, tile, rinshan: false });
}

/** Compra de reposição do muro morto; uma peça do fim do muro vivo passa para o muro morto. */
function drawReplacement(ctx: Ctx, seat: Seat): void {
  const { s, h, events } = ctx;
  const tile = h.replacements.shift();
  const moved = h.wall.pop();
  if (!tile || !moved) throw new Error('Reposição impossível: muro esgotado');
  h.replacements.push(moved);
  const p = playerOf(h, seat);
  p.hand.push(tile);
  p.drawn = tile;
  h.turn = seat;
  h.turnKind = 'rinshan';
  h.forbiddenDiscards = [];
  s.phase = 'awaitingDiscard';
  events.push({ type: 'TileDrawn', seat, tile, rinshan: true });
}

function registerKan(ctx: Ctx, seat: Seat): void {
  const { s, h } = ctx;
  h.kanSeats.push(seat);
  if (s.rules.abortive.suukaikan && h.kanSeats.length === 4 && new Set(h.kanSeats).size > 1) {
    h.suukaikanPending = true;
  }
}

/** Riichi declarado no descarte vira efetivo (bastão pago) quando o descarte não é vencido por ron. */
function establishRiichi(ctx: Ctx, seat: Seat): void {
  const { s, h, events } = ctx;
  const p = playerOf(h, seat);
  if (!p.riichi || p.riichi.established) return;
  p.riichi.established = true;
  p.riichi.ippatsu = true;
  s.scores[seat] = (s.scores[seat] as number) - s.rules.riichiCost;
  s.riichiSticks += 1;
  events.push({ type: 'RiichiDeclared', seat });
}

// ---------------------------------------------------------------------------------------------
// Turno do jogador

function discard(ctx: Ctx, seat: Seat, tileRef: Tile, riichi: boolean): void {
  const { s, h, events } = ctx;
  const p = playerOf(h, seat);
  const tile = removeTileById(p.hand, tileRef.id);
  const tsumogiri = p.drawn !== null && p.drawn.id === tile.id;
  if (riichi) {
    p.riichi = {
      double: h.uninterrupted && p.discards.length === 0,
      discardIndex: p.discards.length,
      established: false,
      ippatsu: false,
    };
  } else if (p.riichi?.established) {
    p.riichi.ippatsu = false;
  }
  p.discards.push({ tile, tsumogiri, riichi, calledBy: null });
  p.drawn = null;
  p.furiten.temporary = false;
  h.forbiddenDiscards = [];
  events.push({ type: 'TileDiscarded', seat, tile, tsumogiri, riichi });
  revealPendingDora(ctx);

  const options = computeCallOptions(s, seat, tile);
  if (Object.keys(options).length > 0) {
    h.pendingCalls = { discarder: seat, tile, options, responses: {} };
    s.phase = 'awaitingCalls';
    return;
  }
  afterDiscardResolved(ctx, seat, null);
}

function tsumo(ctx: Ctx, seat: Seat): void {
  const { s, h, events } = ctx;
  const p = playerOf(h, seat);
  const winTile = p.drawn as Tile;
  const scored = evaluateWin(s, seat, p.hand, winTile, tsumoFlags(s, seat));
  if (!scored) throw new Error('Tsumo validado sem pontuação');
  endWithWins(s, [{ seat, from: null, winTile, concealed: p.hand.slice(), scored }], events);
}

function ankan(ctx: Ctx, seat: Seat, kind: TileKind): void {
  const { h, events } = ctx;
  const p = playerOf(h, seat);
  revealPendingDora(ctx);
  const tiles = p.hand.filter((t) => t.kind === kind);
  for (const t of tiles) removeTileById(p.hand, t.id);
  const meld: Meld = { type: 'ankan', tiles };
  p.melds.push(meld);
  p.drawn = null;
  h.uninterrupted = false;
  registerKan(ctx, seat);
  events.push({ type: 'CallMade', seat, meld });
  revealDora(ctx); // dora do ankan: imediata
  openRobbery(ctx, seat, 'ankan', tiles[0] as Tile);
}

function kakan(ctx: Ctx, seat: Seat, tileRef: Tile): void {
  const { h, events } = ctx;
  const p = playerOf(h, seat);
  revealPendingDora(ctx);
  const tile = removeTileById(p.hand, tileRef.id);
  const index = p.melds.findIndex((m) => m.type === 'pon' && m.called.kind === tile.kind);
  const pon = p.melds[index];
  if (!pon || pon.type !== 'pon') throw new Error('Kakan sem pon');
  const meld: Meld = {
    type: 'kakan',
    tiles: [...pon.tiles, tile],
    called: pon.called,
    added: tile,
    from: pon.from,
  };
  p.melds[index] = meld;
  p.drawn = null;
  h.uninterrupted = false;
  events.push({ type: 'CallMade', seat, meld });
  openRobbery(ctx, seat, 'kakan', tile);
}

function kita(ctx: Ctx, seat: Seat): void {
  const { h, events } = ctx;
  const p = playerOf(h, seat);
  const north = p.drawn?.kind === NORTH ? p.drawn : p.hand.find((t) => t.kind === NORTH);
  if (!north) throw new Error('Kita sem Norte');
  removeTileById(p.hand, north.id);
  p.kita.push(north);
  p.drawn = null;
  h.uninterrupted = false; // kita conta como chamada (spec 7.13)
  events.push({ type: 'KitaDeclared', seat, tile: north });
  openRobbery(ctx, seat, 'kita', north);
}

function openRobbery(ctx: Ctx, declarer: Seat, kind: RobberyKind, tile: Tile): void {
  const { s, h } = ctx;
  const eligible = robberyEligible(s, declarer, tile, kind);
  if (eligible.length > 0) {
    h.pendingRobbery = { declarer, kind, tile, eligible, responses: {} };
    s.phase = 'awaitingRobbery';
    return;
  }
  completeDeclaration(ctx, declarer, kind);
}

function completeDeclaration(ctx: Ctx, declarer: Seat, kind: RobberyKind): void {
  const { h } = ctx;
  h.pendingRobbery = null;
  breakIppatsu(h);
  if (kind === 'kakan') {
    registerKan(ctx, declarer);
    h.pendingDora += 1; // dora do kakan: após o próximo descarte
  }
  drawReplacement(ctx, declarer);
}

// ---------------------------------------------------------------------------------------------
// Respostas a descarte e a roubo

function respondRobbery(ctx: Ctx, seat: Seat, response: 'ron' | 'pass'): void {
  const { s, h, events } = ctx;
  const pr = h.pendingRobbery;
  if (!pr) throw new Error('Sem janela de roubo');
  pr.responses[seat] = response;
  if (!pr.eligible.every((e) => pr.responses[e])) return;

  for (const e of pr.eligible) if (pr.responses[e] === 'pass') declineRon(playerOf(h, e));
  const winners = seatsAfter(pr.declarer, playerCount(s)).filter((e) => pr.responses[e] === 'ron');
  if (winners.length > 0) {
    const chankan = pr.kind !== 'kita';
    endWithWins(
      s,
      winners.map((w) => ronCandidate(ctx, w, pr.declarer, pr.tile, { chankan })),
      events,
    );
    return;
  }
  completeDeclaration(ctx, pr.declarer, pr.kind);
}

function declineRon(p: PlayerState): void {
  p.furiten.temporary = true;
  if (p.riichi?.established) p.furiten.riichi = true;
}

function ronCandidate(
  ctx: Ctx,
  seat: Seat,
  from: Seat,
  tile: Tile,
  flags: { chankan?: boolean; houtei?: boolean },
): WinCandidate {
  const p = playerOf(ctx.h, seat);
  const concealed = [...p.hand, tile];
  const scored = evaluateWin(ctx.s, seat, concealed, tile, { winType: 'ron', ...flags });
  if (!scored) throw new Error('Ron validado sem pontuação');
  return { seat, from, winTile: tile, concealed, scored };
}

function respondCall(ctx: Ctx, seat: Seat, action: Action): void {
  const { h } = ctx;
  const pc = h.pendingCalls;
  if (!pc) throw new Error('Sem janela de chamadas');
  const response: CallResponse =
    action.type === 'chi' || action.type === 'pon'
      ? { type: action.type, use: action.use }
      : { type: action.type as 'ron' | 'daiminkan' | 'pass' };
  pc.responses[seat] = response;
  const eligible = Object.keys(pc.options).map((k) => Number(k) as Seat);
  if (!eligible.every((e) => pc.responses[e])) return;
  resolveCalls(ctx);
}

function resolveCalls(ctx: Ctx): void {
  const { s, h, events } = ctx;
  const pc = h.pendingCalls;
  if (!pc) throw new Error('Sem janela de chamadas');
  const order = seatsAfter(pc.discarder, playerCount(s));

  for (const seat of order) {
    if (pc.options[seat]?.ron && pc.responses[seat]?.type !== 'ron') declineRon(playerOf(h, seat));
  }
  const ronners = order.filter((seat) => pc.responses[seat]?.type === 'ron');
  if (ronners.length > 0) {
    const houtei = h.wall.length === 0;
    endWithWins(
      s,
      ronners.map((w) => ronCandidate(ctx, w, pc.discarder, pc.tile, { houtei })),
      events,
    );
    return;
  }

  const caller =
    order.find((seat) => ['pon', 'daiminkan'].includes(pc.responses[seat]?.type ?? '')) ??
    order.find((seat) => pc.responses[seat]?.type === 'chi');
  afterDiscardResolved(ctx, pc.discarder, caller ?? null);
}

/** O descarte não foi vencido: efetiva riichi, verifica abortivos e segue com chamada ou compra. */
function afterDiscardResolved(ctx: Ctx, discarder: Seat, caller: Seat | null): void {
  const { s, h, events } = ctx;
  const pc = h.pendingCalls;
  h.pendingCalls = null;
  establishRiichi(ctx, discarder);
  const rules = s.rules;
  const n = playerCount(s);

  if (h.suukaikanPending) return endAbortive(s, 'suukaikan', events);
  if (rules.abortive.suuchaRiichi && h.players.every((p) => p.riichi?.established)) {
    return endAbortive(s, 'suuchaRiichi', events);
  }

  if (caller !== null && pc) {
    const response = pc.responses[caller];
    if (response && response.type !== 'pass' && response.type !== 'ron') {
      applyCall(ctx, caller, response, pc.discarder, pc.tile);
      return;
    }
  }

  if (rules.abortive.suufonRenda && h.uninterrupted) {
    const firsts = h.players.map((p) => p.discards[0]?.tile.kind);
    const all = h.players.every((p) => p.discards.length === 1);
    if (all && isWind(firsts[0] ?? -1) && firsts.every((k) => k === firsts[0])) {
      return endAbortive(s, 'suufonRenda', events);
    }
  }

  if (h.wall.length === 0) return endExhaustive(s, events);
  draw(ctx, nextSeat(discarder, n));
}

function applyCall(
  ctx: Ctx,
  caller: Seat,
  response: Exclude<CallResponse, { type: 'pass' } | { type: 'ron' }>,
  discarder: Seat,
  tile: Tile,
): void {
  const { s, h, events } = ctx;
  const p = playerOf(h, caller);
  const use =
    response.type === 'daiminkan'
      ? p.hand.filter((t) => t.kind === tile.kind)
      : response.use.map((u) => p.hand.find((t) => t.id === u.id) as Tile);
  for (const t of use) removeTileById(p.hand, t.id);
  const tiles = [...use, tile].sort((a, b) => a.kind - b.kind || a.id - b.id);
  const meld: Meld =
    response.type === 'daiminkan'
      ? { type: 'daiminkan', tiles, called: tile, from: discarder }
      : { type: response.type, tiles, called: tile, from: discarder };
  p.melds.push(meld);
  const discarderState = playerOf(h, discarder);
  const last = discarderState.discards[discarderState.discards.length - 1];
  if (last) last.calledBy = caller;
  h.uninterrupted = false;
  breakIppatsu(h);
  markPao(p, tile.kind, discarder);
  events.push({ type: 'CallMade', seat: caller, meld });

  if (response.type === 'daiminkan') {
    registerKan(ctx, caller);
    h.pendingDora += 1; // dora do kan aberto: após o próximo descarte
    drawReplacement(ctx, caller);
    return;
  }
  p.drawn = null;
  h.turn = caller;
  h.turnKind = 'call';
  h.forbiddenDiscards = kuikaeKinds(tile.kind, use, response.type);
  s.phase = 'awaitingDiscard';
}

/** Pao: quem deu a peça que completou o 3º dragão ou o 4º vento exposto (spec 6.2). */
function markPao(p: PlayerState, kind: TileKind, discarder: Seat): void {
  const tripletKinds = p.melds.filter((m) => m.type !== 'chi').map((m) => m.tiles[0]?.kind ?? -1);
  if (isDragon(kind) && [HAKU, HAKU + 1, CHUN].every((k) => tripletKinds.includes(k))) {
    p.pao.daisangen = discarder;
  }
  if (isWind(kind) && [27, 28, 29, 30].every((k) => tripletKinds.includes(k))) {
    p.pao.daisuushii = discarder;
  }
}
