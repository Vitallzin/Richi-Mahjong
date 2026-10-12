/**
 * IA compartilhada pelos níveis (spec 8.2): a força muda a precisão (ruído, eficiência, defesa, critério
 * para chamar); o estilo muda as escolhas entre opções razoáveis. Nunca muda regras nem sorte.
 */
import {
  isYaochu,
  KIND_COUNT,
  shanten,
  toCounts,
  type Action,
  type LegalActions,
  type PlayerView,
  type Rng,
  type Tile,
  type TileKind,
} from '../engine';
import {
  danger,
  evaluateDiscards,
  hasOpenYakuPath,
  meldCountOf,
  riichiOpponents,
  tileValue,
  type DiscardOption,
} from './analysis';
import type { BotPolicy, BotStyle } from './policy';

export interface SkillParams {
  /** Ruído somado à pontuação de cada descarte (0 = nenhum). */
  readonly noise: number;
  /** Usa ukeire (peças não visíveis) para desempatar. */
  readonly useUkeire: boolean;
  readonly defense: 'none' | 'simple' | 'full';
  /** Só chama se houver caminho de yaku depois da chamada. */
  readonly requireYakuToCall: boolean;
  /** Declara riichi quase sempre que puder (ignora o estilo). */
  readonly alwaysRiichi: boolean;
}

const shantenOf = (tiles: readonly { kind: TileKind }[], melds: number) =>
  shanten(toCounts(tiles), melds);

function chooseDiscard(
  view: PlayerView,
  candidates: readonly Tile[],
  skill: SkillParams,
  style: BotStyle,
  rng: Rng,
): DiscardOption {
  const options = evaluateDiscards(view, candidates);
  const bestShanten = Math.min(...options.map((o) => o.shanten));
  const threats = riichiOpponents(view).length > 0;
  const defending =
    skill.defense !== 'none' &&
    threats &&
    (bestShanten >= 2 || (bestShanten === 1 && style.defenseWeight > 0.6)) &&
    rng.next() < 0.4 + style.defenseWeight * 0.6;

  let best: DiscardOption | null = null;
  let bestScore = -Infinity;
  for (const o of options) {
    let score = -o.shanten * 100;
    if (skill.useUkeire) score += o.ukeire * (0.6 + style.speedWeight * 0.4);
    // Manter dora/vermelha/honra com valor pesa conforme o gosto por mãos caras.
    score -= tileValue(view, o.tile) * (4 + style.handValueWeight * 8);
    // Sem leitura fina: livrar-se de terminais/honras isolados primeiro.
    if (isYaochu(o.tile.kind)) score += 1.5;
    if (defending)
      score -= danger(view, o.tile.kind, skill.defense === 'full') * 40 * (1.2 - style.risk);
    score += (rng.next() - 0.5) * skill.noise * 100;
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  if (!best) throw new Error('Bot sem descarte possível');
  return best;
}

function turnDecision(
  view: PlayerView,
  legal: LegalActions,
  skill: SkillParams,
  style: BotStyle,
  rng: Rng,
): Action {
  if (legal.tsumo) return { type: 'tsumo' };
  if (legal.kita) return { type: 'kita' };
  const me = view.players[view.seat];
  const melds = meldCountOf(view);
  const current = shantenOf(view.hand, melds);

  if (legal.kyuushuKyuuhai && current >= 3 && rng.next() < 0.85) return { type: 'kyuushuKyuuhai' };

  for (const kind of legal.ankan) {
    if (me?.riichi) return { type: 'ankan', kind };
    const rest = view.hand.filter((t) => t.kind !== kind);
    if (shantenOf(rest, melds + 1) <= current && rng.next() < 0.5 + style.callTendency * 0.5) {
      return { type: 'ankan', kind };
    }
  }
  const threats = riichiOpponents(view).length > 0;
  if (legal.kakan.length > 0 && (!threats || skill.defense === 'none') && rng.next() < 0.6) {
    return { type: 'kakan', tile: legal.kakan[0] as Tile };
  }

  if (legal.riichi.length > 0) {
    const wantRiichi = skill.alwaysRiichi ? 0.95 : 0.55 + style.riichiTendency * 0.45;
    if (rng.next() < wantRiichi) {
      const choice = chooseDiscard(view, legal.riichi, { ...skill, defense: 'none' }, style, rng);
      return { type: 'discard', tile: choice.tile, riichi: true };
    }
  }
  return { type: 'discard', tile: chooseDiscard(view, legal.discard, skill, style, rng).tile };
}

/** Melhor shanten depois de chamar `use` (retirando-as) e descartar uma peça permitida. */
function shantenAfterCall(view: PlayerView, use: readonly Tile[], called: TileKind): number {
  const ids = new Set(use.map((t) => t.id));
  const rest = view.hand.filter((t) => !ids.has(t.id));
  const melds = meldCountOf(view) + 1;
  const counts = toCounts(rest);
  let best = Infinity;
  for (let k = 0; k < KIND_COUNT; k++) {
    if ((counts[k] as number) === 0 || k === called) continue;
    counts[k] = (counts[k] as number) - 1;
    best = Math.min(best, shanten(counts, melds));
    counts[k] = (counts[k] as number) + 1;
  }
  return best;
}

function callDecision(
  view: PlayerView,
  legal: LegalActions,
  skill: SkillParams,
  style: BotStyle,
  rng: Rng,
): Action {
  if (legal.ron) return { type: 'ron' };
  const called = view.callTile?.tile.kind;
  if (called === undefined) return { type: 'pass' };
  const melds = meldCountOf(view);
  const current = shantenOf(view.hand, melds);
  const threats = riichiOpponents(view).length > 0;
  if (skill.defense !== 'none' && threats && current >= 2 && style.defenseWeight > 0.3)
    return { type: 'pass' };

  const willing = skill.requireYakuToCall
    ? 0.3 + style.callTendency * 0.7
    : style.callTendency * 0.7;
  if (rng.next() >= willing) return { type: 'pass' };

  type Option = { action: Action; after: number };
  const options: Option[] = [];
  for (const use of legal.pon) {
    options.push({
      action: { type: 'pon', use: [use[0], use[1]] },
      after: shantenAfterCall(view, use, called),
    });
  }
  for (const use of legal.chi) {
    options.push({
      action: { type: 'chi', use: [use[0], use[1]] },
      after: shantenAfterCall(view, use, called),
    });
  }
  if (legal.daiminkan) {
    const use = view.hand.filter((t) => t.kind === called);
    const rest = view.hand.filter((t) => t.kind !== called);
    options.push({
      action: { type: 'daiminkan' },
      after: shantenOf(rest, melds + 1) + (use.length === 3 ? 0 : 9),
    });
  }
  const good = options
    .filter((o) => (o.action.type === 'daiminkan' ? o.after <= current : o.after < current))
    .sort((a, b) => a.after - b.after);
  const best = good[0];
  if (!best) return { type: 'pass' };
  if (skill.requireYakuToCall && !hasOpenYakuPath(view, [called])) return { type: 'pass' };
  // Mão fechada perto de tenpai: abrir só com tendência alta a chamar.
  const closed = (view.players[view.seat]?.melds ?? []).every((m) => m.type === 'ankan');
  if (skill.requireYakuToCall && closed && current <= 1 && rng.next() > style.callTendency) {
    return { type: 'pass' };
  }
  return best.action;
}

export function createPolicy(skill: SkillParams, style: BotStyle): BotPolicy {
  return {
    decide(view, legal, rng) {
      if (legal.ackSummary) return { type: 'ackSummary' };
      if (legal.pass) return callDecision(view, legal, skill, style, rng);
      return turnDecision(view, legal, skill, style, rng);
    },
  };
}
