/**
 * Bot Difícil (spec 8.2): eficiência (ukeire e qualidade do tenpai) + valor esperado das esperas +
 * defesa por risco de cada peça + decisão de avançar ou recuar + contexto de placar. Pouco ruído.
 * O estilo do personagem ajusta pesos; a força nunca muda regras nem sorte. Só PlayerView.
 */
import {
  isHonor,
  isYaochu,
  KIND_COUNT,
  rankSeats,
  shanten,
  toCounts,
  visibleCounts,
  waits,
  type Action,
  type LegalActions,
  type PlayerView,
  type Rng,
  type Tile,
  type TileKind,
} from '../../engine';
import { hasOpenYakuPath, isValuedHonor, meldCountOf, tileValue, ukeire } from '../analysis';
import type { BotPolicy, BotStyle } from '../policy';
import { threatsOf, tileRisk, type Threat } from './risk';
import { tenpaiInfo, type TenpaiInfo } from './value';

interface Situation {
  readonly threats: readonly Threat[];
  readonly threatLevel: number;
  /** Última mão prevista (oorasu). */
  readonly allLast: boolean;
  /** 0 = 1º lugar. */
  readonly rank: number;
  readonly leadOverNext: number;
  readonly behindFirst: number;
}

function situation(view: PlayerView): Situation {
  const threats = threatsOf(view);
  const n = view.rules.players;
  const lastWind = view.rules.length === 'south' ? 1 : 0;
  const allLast =
    view.rules.length === 'oneHand' || (view.roundWind - 27 >= lastWind && view.handNumber >= n);
  const scores = view.players.map((p) => p.score);
  const ranking = rankSeats(scores);
  const rank = ranking.indexOf(view.seat);
  const mine = scores[view.seat] ?? 0;
  const next = ranking[rank + 1];
  const first = ranking[0];
  return {
    threats,
    threatLevel: threats.reduce((a, t) => a + t.weight, 0),
    allLast,
    rank,
    leadOverNext: next === undefined ? 0 : mine - (scores[next] ?? 0),
    behindFirst: first === undefined ? 0 : (scores[first] ?? 0) - mine,
  };
}

/** Pontos aproximados da mão atual (para decidir se vale arriscar). */
function roughValue(view: PlayerView, tenpai: TenpaiInfo | null): number {
  if (tenpai && tenpai.remaining > 0) {
    const best = Math.max(...tenpai.waits.map((w) => w.ronWithRiichi));
    if (best > 0) return best;
  }
  const me = view.players[view.seat];
  let han = 1 + (me?.kita.length ?? 0);
  const counts = toCounts([...view.hand, ...(me?.melds.flatMap((m) => m.tiles) ?? [])]);
  for (const t of view.hand) han += tileValue(view, t) >= 1 ? 1 : 0;
  for (let k = 27; k < KIND_COUNT; k++)
    if ((counts[k] ?? 0) >= 2 && isValuedHonor(view, k)) han += 0.7;
  const base = han >= 5 ? 2000 : han >= 4 ? 1920 : han >= 3 ? 960 : han >= 2 ? 520 : 300;
  return base * (me?.isDealer ? 6 : 4);
}

/** Quanto vale continuar atacando (0 = recuar de vez, 1 = ignorar o perigo). */
function pushFactor(view: PlayerView, sit: Situation, sh: number, value: number, style: BotStyle) {
  let push = sh <= 0 ? 0.8 : sh === 1 ? 0.3 : 0.04;
  if (value >= 7700) push += 0.15;
  else if (value < 2000 && sh <= 0) push -= 0.25;
  push += (style.risk - 0.5) * 0.3 - (style.defenseWeight - 0.5) * 0.3;
  if (sit.allLast) {
    // 1º com folga: só segura. Último e longe: precisa vencer.
    if (sit.rank === 0 && sit.leadOverNext >= 4000) push -= 0.3;
    if (sit.rank === view.rules.players - 1) push += 0.25;
  }
  return Math.min(1, Math.max(0, push));
}

/** Para um 1-shanten: soma, sobre as compras que levam a tenpai, das esperas do melhor tenpai. */
function tenpaiQuality(hand: Tile[], melds: number, visible: readonly number[]): number {
  const counts = toCounts(hand);
  let total = 0;
  for (let k = 0; k < KIND_COUNT; k++) {
    const left = 4 - (visible[k] ?? 0);
    if (left <= 0 || (counts[k] ?? 0) >= 4) continue;
    counts[k] = (counts[k] ?? 0) + 1;
    if (shanten(counts, melds) === 0) {
      let best = 0;
      for (let d = 0; d < KIND_COUNT; d++) {
        if ((counts[d] ?? 0) === 0) continue;
        counts[d] = (counts[d] ?? 0) - 1;
        if (shanten(counts, melds) === 0) best = Math.max(best, waitCount(counts, melds, visible));
        counts[d] = (counts[d] ?? 0) + 1;
      }
      total += left * best;
    }
    counts[k] = (counts[k] ?? 0) - 1;
  }
  return total;
}

/** Cópias restantes que completam uma mão de 13 em tenpai. */
function waitCount(counts: number[], melds: number, visible: readonly number[]): number {
  let n = 0;
  for (const k of waits(counts, melds)) n += Math.max(0, 4 - (visible[k] ?? 0));
  return n;
}

interface Option {
  readonly tile: Tile;
  readonly shanten: number;
  readonly score: number;
  readonly risk: number;
  readonly tenpai: TenpaiInfo | null;
}

/** Avalia cada descarte (um por tipo/vermelho) e devolve do melhor para o pior. */
function rankDiscards(
  view: PlayerView,
  candidates: readonly Tile[],
  style: BotStyle,
  sit: Situation,
  rng: Rng,
  riichiNow: boolean,
): Option[] {
  const melds = meldCountOf(view);
  const visible = visibleCounts(view);
  const unique = new Map<string, Tile>();
  for (const t of candidates) unique.set(`${t.kind}:${t.red}`, t);
  const handCounts = toCounts(view.hand);
  const base = [...unique.values()].map((tile) => {
    const rest = view.hand.filter((x) => x !== tile && x.id !== tile.id);
    const counts = toCounts(rest);
    return { tile, rest, counts, sh: shanten(counts, melds) };
  });
  const bestSh = Math.min(...base.map((b) => b.sh));
  const tenpaiRest = base.find((b) => b.sh === 0)?.rest;
  const valueNow = roughValue(view, tenpaiRest ? tenpaiInfo(view, tenpaiRest) : null);
  const push = pushFactor(view, sit, bestSh, valueNow, style);
  const foldWeight = sit.threatLevel * (1 - push) * (0.6 + style.defenseWeight * 0.8);

  return base
    .map(({ tile, rest, counts, sh }) => {
      let score = -sh * 1000;
      let tenpai: TenpaiInfo | null = null;
      if (sh <= bestSh + 1) {
        if (sh === 0) {
          tenpai = tenpaiInfo(view, rest);
          if (tenpai) {
            const ev = riichiNow || tenpai.closed ? tenpai.riichiEv : tenpai.damaEv;
            score += tenpai.remaining * 25 + ev / 300;
            // Tenpai aberto sem yaku não vence: vale como 1-shanten.
            if (!tenpai.closed && tenpai.damaEv === 0) score -= 700;
            if (tenpai.remaining === 0) score -= 500;
          }
        } else {
          score += ukeire(counts, melds, sh, visible) * (8 + style.speedWeight * 6);
          // Qualidade do futuro tenpai: só quando a disputa é entre opções 1-shanten (custo alto).
          if (sh === 1 && bestSh === 1) score += tenpaiQuality(rest, melds, visible) * 0.6;
        }
      }
      // Valor: dora, vermelhas, honras de valor; pares de honra de valor valem guardar.
      score -= tileValue(view, tile) * (35 + style.handValueWeight * 70);
      if (isValuedHonor(view, tile.kind) && (handCounts[tile.kind] ?? 0) >= 2) score -= 50;
      // Honras e terminais isolados saem cedo (deixam a mão mais flexível e tanyao possível).
      if (isYaochu(tile.kind) && (handCounts[tile.kind] ?? 0) === 1)
        score += isHonor(tile.kind) ? 18 : 10;
      const risk = tileRisk(view, tile.kind, sit.threats);
      score -= risk * foldWeight * 45;
      score += (rng.next() - 0.5) * 6;
      return { tile, shanten: sh, score, risk, tenpai };
    })
    .sort((a, b) => b.score - a.score);
}

function turn(view: PlayerView, legal: LegalActions, style: BotStyle, rng: Rng): Action {
  if (legal.tsumo) return { type: 'tsumo' };
  if (legal.kita) return { type: 'kita' };
  const me = view.players[view.seat];
  const melds = meldCountOf(view);
  const current = shanten(toCounts(view.hand), melds);
  const sit = situation(view);

  if (legal.kyuushuKyuuhai) {
    const kinds = new Set(view.hand.filter((t) => isYaochu(t.kind)).map((t) => t.kind)).size;
    if (kinds < 11 && current >= 3) return { type: 'kyuushuKyuuhai' };
  }
  for (const kind of legal.ankan) {
    if (me?.riichi) return { type: 'ankan', kind };
    const rest = view.hand.filter((t) => t.kind !== kind);
    if (sit.threatLevel === 0 && shanten(toCounts(rest), melds + 1) <= current) {
      return { type: 'ankan', kind };
    }
  }
  if (legal.kakan.length > 0 && (sit.threatLevel === 0 || current === 0)) {
    return { type: 'kakan', tile: legal.kakan[0] as Tile };
  }

  if (legal.riichi.length > 0) {
    const best = rankDiscards(view, legal.riichi, style, sit, rng, true)[0];
    const normal = rankDiscards(view, legal.discard, style, sit, rng, false)[0];
    if (best?.tenpai && normal) {
      const t = best.tenpai;
      const damaYaku = t.damaEv > 0;
      const avgDama = t.remaining > 0 ? t.damaEv / t.remaining : 0;
      // Recuando de verdade (o melhor descarte não é tenpai): não declara.
      const folding = normal.shanten > 0 && normal.score > best.score + 200;
      let declare = !damaYaku || avgDama < 3900 || rng.next() < style.riichiTendency * 0.6;
      // Última mão em 1º com folga e mão já com yaku: dama para não arriscar o bastão.
      if (sit.allLast && sit.rank === 0 && damaYaku) declare = false;
      if (t.remaining <= 1 && damaYaku) declare = false;
      if (declare && !folding) return { type: 'discard', tile: best.tile, riichi: true };
    }
  }
  const choice = rankDiscards(view, legal.discard, style, sit, rng, false)[0];
  if (!choice) throw new Error('Bot sem descarte possível');
  return { type: 'discard', tile: choice.tile };
}

/** Melhor shanten depois de chamar (retirando `use`) e descartar uma peça. */
function shantenAfterCall(view: PlayerView, use: readonly Tile[], called: TileKind): number {
  const ids = new Set(use.map((t) => t.id));
  const counts = toCounts(view.hand.filter((t) => !ids.has(t.id)));
  const melds = meldCountOf(view) + 1;
  let best = Infinity;
  for (let k = 0; k < KIND_COUNT; k++) {
    if ((counts[k] ?? 0) === 0 || k === called) continue;
    counts[k] = (counts[k] ?? 0) - 1;
    best = Math.min(best, shanten(counts, melds));
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return best;
}

function call(view: PlayerView, legal: LegalActions, style: BotStyle, rng: Rng): Action {
  if (legal.ron) return { type: 'ron' };
  const called = view.callTile?.tile.kind;
  if (called === undefined) return { type: 'pass' };
  const melds = meldCountOf(view);
  const current = shanten(toCounts(view.hand), melds);
  const sit = situation(view);
  const closed = (view.players[view.seat]?.melds ?? []).every((m) => m.type === 'ankan');
  if (!hasOpenYakuPath(view, [called])) return { type: 'pass' };

  const valuedPon = isValuedHonor(view, called) && legal.pon.length > 0;
  type Opt = { action: Action; after: number };
  const options: Opt[] = [
    ...legal.pon.map((use) => ({
      action: { type: 'pon', use: [use[0], use[1]] } as Action,
      after: shantenAfterCall(view, use, called),
    })),
    ...legal.chi.map((use) => ({
      action: { type: 'chi', use: [use[0], use[1]] } as Action,
      after: shantenAfterCall(view, use, called),
    })),
  ].sort((a, b) => a.after - b.after);
  const best = options[0];
  if (!best) return { type: 'pass' };
  // Com ameaça na mesa, só chama se a chamada deixa em tenpai.
  if (sit.threatLevel > 0 && best.after > 0) return { type: 'pass' };
  // Pon de honra de valor: yaku garantido e quase sempre acelera.
  if (valuedPon && best.after <= current && style.callTendency >= 0.15) return best.action;
  if (best.after >= current) return { type: 'pass' };
  // Mão fechada boa (1-shanten): abrir só se ficar em tenpai e o estilo gostar de chamar.
  if (closed && current <= 1 && !(best.after === 0 && rng.next() < 0.35 + style.callTendency * 0.6))
    return { type: 'pass' };
  // Longe do tenpai: chama conforme o gosto por velocidade.
  if (current >= 2 && rng.next() > 0.25 + (style.callTendency + style.speedWeight) * 0.4)
    return { type: 'pass' };
  // Última mão: o 1º com folga acelera para encerrar.
  if (sit.allLast && sit.rank === 0 && sit.leadOverNext >= 4000) return best.action;
  return best.action;
}

export function createHardPolicy(style: BotStyle): BotPolicy {
  return {
    decide(view, legal, rng) {
      if (legal.ackSummary) return { type: 'ackSummary' };
      if (legal.pass) return call(view, legal, style, rng);
      return turn(view, legal, style, rng);
    },
  };
}
