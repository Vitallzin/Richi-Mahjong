/**
 * Simulador de partidas bot-aleatório-legal × bot-aleatório-legal (spec 14.2 e aceite da Fase 1).
 * Verifica invariantes a cada ação: conservação de peças, conservação de pontos, coerência entre
 * getLegalActions e applyAction, e término da partida.
 */
import {
  applyAction,
  buildTileSet,
  canStartNextHand,
  createMatch,
  createRng,
  getLegalActions,
  IllegalActionError,
  startNextHand,
  toCounts,
  type Action,
  type Tile,
  type LegalActions,
  type MatchState,
  type Rng,
  type RuleSet,
  type Seat,
} from '../../src/engine';

export interface SimOptions {
  /** Testa todas as ações legais do assento escolhido a cada N passos (0 = nunca). */
  readonly exhaustiveLegalEvery?: number;
  /** Tenta ações ilegais aleatórias a cada N passos (0 = nunca). */
  readonly illegalProbeEvery?: number;
  readonly maxSteps?: number;
}

export interface SimStats {
  hands: number;
  wins: number;
  tsumo: number;
  ron: number;
  multiRon: number;
  exhaustive: number;
  abortive: Record<string, number>;
  yaku: Record<string, number>;
  calls: Record<string, number>;
  riichi: number;
  endReasons: Record<string, number>;
  steps: number;
}

export const emptyStats = (): SimStats => ({
  hands: 0,
  wins: 0,
  tsumo: 0,
  ron: 0,
  multiRon: 0,
  exhaustive: 0,
  abortive: {},
  yaku: {},
  calls: {},
  riichi: 0,
  endReasons: {},
  steps: 0,
});

const inc = (rec: Record<string, number>, key: string) => {
  rec[key] = (rec[key] ?? 0) + 1;
};

export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

/** Lista todas as ações concretas disponíveis. */
export function enumerateActions(legal: LegalActions): Action[] {
  const out: Action[] = [];
  for (const tile of legal.discard) out.push({ type: 'discard', tile });
  for (const tile of legal.riichi) out.push({ type: 'discard', tile, riichi: true });
  if (legal.tsumo) out.push({ type: 'tsumo' });
  if (legal.ron) out.push({ type: 'ron' });
  for (const use of legal.chi) out.push({ type: 'chi', use: [use[0], use[1]] });
  for (const use of legal.pon) out.push({ type: 'pon', use: [use[0], use[1]] });
  if (legal.daiminkan) out.push({ type: 'daiminkan' });
  for (const kind of legal.ankan) out.push({ type: 'ankan', kind });
  for (const tile of legal.kakan) out.push({ type: 'kakan', tile });
  if (legal.kita) out.push({ type: 'kita' });
  if (legal.kyuushuKyuuhai) out.push({ type: 'kyuushuKyuuhai' });
  if (legal.pass) out.push({ type: 'pass' });
  if (legal.ackSummary) out.push({ type: 'ackSummary' });
  return out;
}

/** Peça com menos vizinhos úteis (mesma peça e ±1/±2 no naipe); desempate aleatório. */
function leastConnected(tiles: readonly Tile[], rng: Rng): Tile {
  const counts = toCounts(tiles);
  const score = (k: number) => {
    let v = ((counts[k] ?? 0) - 1) * 3;
    if (k < 27) {
      for (const d of [-2, -1, 1, 2]) {
        const j = k + d;
        if (j >= 0 && Math.floor(j / 9) === Math.floor(k / 9))
          v += (counts[j] ?? 0) * (Math.abs(d) === 1 ? 2 : 1);
      }
    }
    return v;
  };
  let best: Tile[] = [];
  let bestScore = Infinity;
  for (const t of tiles) {
    const v = score(t.kind);
    if (v < bestScore) {
      bestScore = v;
      best = [t];
    } else if (v === bestScore) best.push(t);
  }
  return best[rng.int(best.length)]!;
}

/** Política aleatória com pesos: vence quase sempre, chama às vezes, declara riichi com frequência. */
export function randomPolicy(legal: LegalActions, rng: Rng): Action {
  if ((legal.tsumo || legal.ron) && rng.next() < 0.9)
    return { type: legal.tsumo ? 'tsumo' : 'ron' };
  if (legal.ackSummary) return { type: 'ackSummary' };
  if (legal.riichi.length > 0 && rng.next() < 0.7) {
    return { type: 'discard', tile: legal.riichi[rng.int(legal.riichi.length)]!, riichi: true };
  }
  const special: Action[] = [];
  for (const kind of legal.ankan) special.push({ type: 'ankan', kind });
  for (const tile of legal.kakan) special.push({ type: 'kakan', tile });
  if (legal.kita) special.push({ type: 'kita' });
  if (legal.daiminkan) special.push({ type: 'daiminkan' });
  for (const use of legal.pon) special.push({ type: 'pon', use: [use[0], use[1]] });
  for (const use of legal.chi) special.push({ type: 'chi', use: [use[0], use[1]] });
  if (legal.kyuushuKyuuhai) special.push({ type: 'kyuushuKyuuhai' });
  if (special.length > 0 && rng.next() < 0.35) return special[rng.int(special.length)]!;
  if (legal.discard.length > 0) {
    // Na maior parte das vezes descarta a peça menos conectada (para as mãos chegarem a tenpai).
    const tile =
      rng.next() < 0.85
        ? leastConnected(legal.discard, rng)
        : legal.discard[rng.int(legal.discard.length)]!;
    return { type: 'discard', tile };
  }
  if (legal.pass) return { type: 'pass' };
  const all = enumerateActions(legal);
  if (all.length === 0) throw new InvariantError('Assento escolhido sem ações');
  return all[rng.int(all.length)]!;
}

function checkTiles(s: MatchState): void {
  const h = s.hand;
  if (!h) return;
  const ids: number[] = [];
  ids.push(...h.wall.map((t) => t.id), ...h.replacements.map((t) => t.id));
  ids.push(...h.doraIndicators.map((t) => t.id), ...h.uraIndicators.map((t) => t.id));
  for (const p of h.players) {
    ids.push(...p.hand.map((t) => t.id));
    ids.push(...p.kita.map((t) => t.id));
    for (const m of p.melds) ids.push(...m.tiles.map((t) => t.id));
    for (const d of p.discards) if (d.calledBy === null) ids.push(d.tile.id);
  }
  const expected = buildTileSet(s.rules.mode, s.rules.akaDora).map((t) => t.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) throw new InvariantError('Peça duplicada');
  if (ids.length !== expected.length) {
    throw new InvariantError(`Peças: ${ids.length} em jogo, esperado ${expected.length}`);
  }
  for (const id of expected) if (!unique.has(id)) throw new InvariantError(`Peça ${id} perdida`);
  if (h.replacements.length + h.doraIndicators.length + h.uraIndicators.length !== 14) {
    throw new InvariantError('Muro morto fora de 14 peças');
  }
  // Tamanho da mão: 13 − 3×grupos (+1 na vez de quem comprou/chamou).
  h.players.forEach((p, seat) => {
    const base = 13 - 3 * p.melds.length;
    const extra = s.phase === 'awaitingDiscard' && h.turn === seat ? 1 : 0;
    const len = p.hand.length;
    if (s.phase !== 'handSummary' && s.phase !== 'matchEnded' && len !== base + extra) {
      throw new InvariantError(
        `Mão do assento ${seat} com ${len} peças (esperado ${base + extra})`,
      );
    }
  });
}

function checkPoints(s: MatchState): void {
  const total = s.rules.startingPoints * s.rules.players;
  const sum = s.scores.reduce((a, b) => a + b, 0) + s.riichiSticks * 1000;
  if (sum !== total) throw new InvariantError(`Pontos: ${sum} ≠ ${total}`);
  if (s.result) {
    const final = s.result.finalScores.reduce((a, b) => a + b, 0);
    if (final !== total) throw new InvariantError(`Pontos finais: ${final} ≠ ${total}`);
  }
}

function probeIllegal(s: MatchState, rng: Rng): void {
  const n = s.rules.players;
  const seat = rng.int(n) as Seat;
  const legal = getLegalActions(s, seat);
  const fake = { id: 9999, kind: 0, red: false };
  const candidates: Action[] = [
    { type: 'discard', tile: fake },
    { type: 'kakan', tile: fake },
  ];
  if (!legal.tsumo) candidates.push({ type: 'tsumo' });
  if (!legal.ron) candidates.push({ type: 'ron' });
  if (!legal.pass) candidates.push({ type: 'pass' });
  if (!legal.kita) candidates.push({ type: 'kita' });
  if (!legal.ackSummary) candidates.push({ type: 'ackSummary' });
  if (!legal.daiminkan) candidates.push({ type: 'daiminkan' });
  const action = candidates[rng.int(candidates.length)]!;
  const before = JSON.stringify(s);
  try {
    applyAction(s, seat, action);
  } catch (e) {
    if (!(e instanceof IllegalActionError)) throw e;
    if (JSON.stringify(s) !== before) throw new InvariantError('Ação ilegal alterou o estado');
    return;
  }
  throw new InvariantError(`Ação ilegal aceita: ${action.type} do assento ${seat}`);
}

function record(stats: SimStats, s: MatchState, prevPhase: string): void {
  if (s.phase === 'handSummary' && prevPhase !== 'handSummary' && s.summary) {
    const sum = s.summary;
    stats.hands += 1;
    if (sum.kind === 'win') {
      stats.wins += 1;
      if (sum.wins.length > 1) stats.multiRon += 1;
      for (const w of sum.wins) {
        if (w.winType === 'tsumo') stats.tsumo += 1;
        else stats.ron += 1;
        for (const y of [...w.scored.yaku, ...w.scored.yakuman]) inc(stats.yaku, y.id);
      }
    } else if (sum.kind === 'exhaustive') stats.exhaustive += 1;
    else inc(stats.abortive, sum.abortiveReason ?? '?');
  }
}

/** Simula uma partida completa. Lança InvariantError se algo quebrar. */
export function simulateMatch(
  rules: RuleSet,
  seed: number,
  options: SimOptions = {},
  stats: SimStats = emptyStats(),
): MatchState {
  const rng = createRng(seed);
  const { exhaustiveLegalEvery = 0, illegalProbeEvery = 0, maxSteps = 50_000 } = options;
  let { state } = createMatch(rules, rng.int(2 ** 32));
  let steps = 0;
  checkTiles(state);
  checkPoints(state);
  while (state.phase !== 'matchEnded') {
    if (++steps > maxSteps) throw new InvariantError(`Partida não terminou em ${maxSteps} passos`);
    if (canStartNextHand(state)) {
      state = startNextHand(state, rng.int(2 ** 32)).state;
      checkTiles(state);
      continue;
    }
    const seats = Array.from({ length: rules.players }, (_, i) => i as Seat);
    const actors = seats.filter(
      (seat) => enumerateActions(getLegalActions(state, seat)).length > 0,
    );
    if (actors.length === 0)
      throw new InvariantError(`Nenhum assento pode agir na fase ${state.phase}`);
    const seat = actors[rng.int(actors.length)]!;
    const legal = getLegalActions(state, seat);

    if (exhaustiveLegalEvery > 0 && steps % exhaustiveLegalEvery === 0) {
      for (const a of enumerateActions(legal)) {
        try {
          applyAction(state, seat, a);
        } catch (e) {
          throw new InvariantError(`Ação legal rejeitada (${a.type}): ${(e as Error).message}`);
        }
      }
    }
    if (illegalProbeEvery > 0 && steps % illegalProbeEvery === 0) probeIllegal(state, rng);

    const action = randomPolicy(legal, rng);
    if (action.type === 'discard' && action.riichi) stats.riichi += 1;
    if (['chi', 'pon', 'daiminkan', 'ankan', 'kakan', 'kita'].includes(action.type))
      inc(stats.calls, action.type);
    const prevPhase = state.phase;
    state = applyAction(state, seat, action).state;
    checkTiles(state);
    checkPoints(state);
    record(stats, state, prevPhase);
  }
  stats.steps += steps;
  if (!state.result) throw new InvariantError('Partida encerrada sem resultado');
  inc(stats.endReasons, state.result.endReason);
  return state;
}
