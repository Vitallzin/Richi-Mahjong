/**
 * Risco de descarte do Difícil (spec 8.2: genbutsu, suji, kabe, risco por peça), só com a PlayerView.
 * Devolve uma estimativa em "% de dar ron" contra cada ameaça, ponderada pelo tamanho da ameaça.
 */
import {
  isHonor,
  isTerminal,
  visibleCounts,
  type PlayerView,
  type PublicPlayerView,
  type TileKind,
} from '../../engine';

export interface Threat {
  readonly seat: number;
  /** 1 = riichi (ou mão aberta com 3+ grupos de valor); menor para ameaças incertas. */
  readonly weight: number;
  /** Peças contra as quais esse jogador certamente não faz ron. */
  readonly safe: ReadonlySet<TileKind>;
  readonly dealer: boolean;
}

/** Peças seguras contra um jogador: os próprios descartes e, se em riichi, o que passou depois. */
function safeAgainst(view: PlayerView, p: PublicPlayerView): Set<TileKind> {
  const safe = new Set(p.discards.map((d) => d.tile.kind));
  if (p.riichi?.established) {
    const since = p.riichi.discardIndex;
    for (const other of view.players) {
      if (other.seat === p.seat) continue;
      // Aproximação: descartes dos outros a partir da mesma "volta" do riichi (furiten de riichi).
      other.discards
        .slice(since + (other.seat > p.seat ? 0 : 1))
        .forEach((d) => safe.add(d.tile.kind));
    }
  }
  return safe;
}

export function threatsOf(view: PlayerView): Threat[] {
  const out: Threat[] = [];
  for (const p of view.players) {
    if (p.seat === view.seat) continue;
    let weight = 0;
    if (p.riichi?.established) weight = 1;
    else {
      const open = p.melds.filter((m) => m.type !== 'ankan').length;
      if (open >= 3) weight = 0.75;
      else if (open === 2) weight = 0.35;
    }
    if (weight > 0)
      out.push({ seat: p.seat, weight, safe: safeAgainst(view, p), dealer: p.isDealer });
  }
  return out;
}

/** % aproximado de uma peça dar ron contra uma espera desconhecida (tabelas clássicas de defesa). */
function baseRisk(kind: TileKind, t: Threat, visible: readonly number[]): number {
  if (t.safe.has(kind)) return 0;
  if (isHonor(kind)) {
    const seen = visible[kind] ?? 0;
    return seen >= 3 ? 0.3 : seen === 2 ? 2.5 : seen === 1 ? 6 : 8;
  }
  const n = kind % 9;
  const suit = Math.floor(kind / 9);
  const same = (k: number) => k >= 0 && k < 27 && Math.floor(k / 9) === suit;
  const safeK = (k: number) => same(k) && t.safe.has(k);
  const lowSuji = n >= 3 && safeK(kind - 3);
  const highSuji = n <= 5 && safeK(kind + 3);
  const fullSuji = n < 3 ? highSuji : n > 5 ? lowSuji : lowSuji && highSuji;
  const halfSuji = !fullSuji && (lowSuji || highSuji);
  let r: number;
  if (isTerminal(kind)) r = fullSuji ? 2.5 : 6.5;
  else if (n === 1 || n === 7) r = fullSuji ? 3.5 : 9;
  else r = fullSuji ? 5 : halfSuji ? 8.5 : 12;
  // Kabe: as 4 cópias de um vizinho visíveis eliminam esperas que dependem dele.
  const all = (k: number) => same(k) && (visible[k] ?? 0) >= 4;
  if ((n >= 1 && all(kind - 1)) || (n <= 7 && all(kind + 1))) r *= 0.55;
  if (n >= 2 && all(kind - 2) && n <= 6 && all(kind + 2)) r *= 0.7;
  // Peça já muito vista (3 cópias): tanki/shanpon ficam improváveis.
  if ((visible[kind] ?? 0) >= 3) r *= 0.6;
  return r;
}

/** Risco total ponderado (soma das ameaças; dealer pesa mais). */
export function tileRisk(view: PlayerView, kind: TileKind, threats: readonly Threat[]): number {
  if (threats.length === 0) return 0;
  const visible = visibleCounts(view);
  let total = 0;
  for (const t of threats) total += baseRisk(kind, t, visible) * t.weight * (t.dealer ? 1.4 : 1);
  return total;
}
