/**
 * "Caminho de yaku" (pedido do desenvolvedor): qual yaku a mão está seguindo, em linguagem de
 * aprendiz. Em tenpai vem das esperas (exato); antes disso, da forma da mão (estimativa).
 * Só usa a PlayerView e nunca sugere descarte (spec 9.6): diz o que a mão é, não o que fazer.
 */
import {
  CHUN,
  HAKU,
  HATSU,
  isHonor,
  isSimple,
  suitOf,
  toCounts,
  type PlayerView,
  type Tile,
  type TileKind,
  type YakuId,
} from '../engine';
import type { HandAdvice } from './analysis';

export interface YakuPath {
  /** Yaku que a mão segue, do mais claro para o mais vago (no máximo 3). */
  readonly yaku: readonly YakuId[];
  /** 'waits': sai das esperas atuais (certo); 'shape': estimado pela forma da mão. */
  readonly source: 'waits' | 'shape';
  /** Mão aberta sem nenhum caminho de yaku à vista (alerta para quem está aprendendo). */
  readonly openWithoutYaku: boolean;
}

/** Yaku que dependem da sorte do momento: não descrevem o "caminho" da mão. */
const SITUATIONAL = new Set<YakuId>([
  'ippatsu',
  'haitei',
  'houtei',
  'rinshan',
  'chankan',
  'tenhou',
  'chiihou',
  'doubleRiichi',
  'menzenTsumo',
]);

/** Yaku de valor maior aparecem antes (o aprendiz vê primeiro o "plano" principal). */
const PRIORITY: readonly YakuId[] = [
  'chinitsu',
  'honitsu',
  'toitoi',
  'chiitoitsu',
  'sanankou',
  'ittsu',
  'sanshokuDoujun',
  'chanta',
  'junchan',
  'shousangen',
  'yakuhaiHaku',
  'yakuhaiHatsu',
  'yakuhaiChun',
  'yakuhaiSeatWind',
  'yakuhaiRoundWind',
  'tanyao',
  'pinfu',
  'iipeikou',
  'riichi',
];

const rank = (id: YakuId) => {
  const i = PRIORITY.indexOf(id);
  return i < 0 ? -1 : i;
};

function sortPaths(ids: Iterable<YakuId>): YakuId[] {
  // Yakuman e raros (fora da lista) primeiro, depois a ordem de PRIORITY.
  return [...new Set(ids)].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
}

/** Estimativa pela forma: o que já está encaminhado com as peças e grupos atuais. */
function fromShape(view: PlayerView, hand: readonly Tile[]): YakuId[] {
  const me = view.players[view.seat];
  const melds = me?.melds ?? [];
  const open = melds.some((m) => m.type !== 'ankan');
  const counts = toCounts(hand);
  const all = [...hand, ...melds.flatMap((m) => m.tiles)];
  const out: YakuId[] = [];

  // Yakuhai: par ou trinca de dragão, vento do assento ou da rodada (já vale com a trinca).
  const has = (kind: TileKind) =>
    (counts[kind] ?? 0) >= 2 || melds.some((m) => m.type !== 'chi' && m.tiles[0]?.kind === kind);
  if (has(HAKU)) out.push('yakuhaiHaku');
  if (has(HATSU)) out.push('yakuhaiHatsu');
  if (has(CHUN)) out.push('yakuhaiChun');
  if (me && has(me.seatWind)) out.push('yakuhaiSeatWind');
  if (has(view.roundWind)) out.push('yakuhaiRoundWind');

  // Toitoi: só pon/kan nos grupos e a mão cheia de pares e trincas.
  const pairsOrSets = counts.filter((c) => c >= 2).length;
  if (melds.every((m) => m.type !== 'chi') && melds.length + pairsOrSets >= 4 && open)
    out.push('toitoi');

  // Chiitoitsu: fechada com 4 ou mais pares.
  if (melds.length === 0 && counts.filter((c) => c >= 2).length >= 4) out.push('chiitoitsu');

  // Um naipe (com ou sem honras): no máximo uma peça fora.
  const suited = all.filter((t) => !isHonor(t.kind));
  const bySuit = new Map<string, number>();
  for (const t of suited) bySuit.set(suitOf(t.kind), (bySuit.get(suitOf(t.kind)) ?? 0) + 1);
  const main = Math.max(0, ...bySuit.values());
  const honors = all.length - suited.length;
  if (suited.length > 0 && suited.length - main <= 1) {
    out.push(honors === 0 ? 'chinitsu' : 'honitsu');
  }

  // Tanyao: só simples (tolera uma peça a trocar); aberto só com kuitan.
  const yaochu = all.filter((t) => !isSimple(t.kind)).length;
  const meldYaochu = melds.some((m) => m.tiles.some((t) => !isSimple(t.kind)));
  if (yaochu <= 1 && !meldYaochu && (!open || view.rules.kuitan)) out.push('tanyao');

  // Fechada: riichi sempre é um caminho.
  if (!open) out.push('riichi');
  return out;
}

/**
 * Caminho de yaku para a mão analisada (a atual ou a que sobraria descartando `discard`), a partir do
 * resultado de analyzeHand.
 */
export function yakuPath(
  view: PlayerView,
  advice: HandAdvice,
  discard: Tile | null = null,
): YakuPath {
  const me = view.players[view.seat];
  const open = (me?.melds ?? []).some((m) => m.type !== 'ankan');
  if (advice.waits.length > 0) {
    const ids = new Set<YakuId>();
    for (const w of advice.waits) {
      for (const c of [w.ron, w.tsumo]) {
        if (!c.ok) continue;
        for (const id of c.yaku) if (!SITUATIONAL.has(id)) ids.add(id);
      }
      if (w.riichiWouldGiveYaku) ids.add('riichi');
    }
    return { yaku: sortPaths(ids), source: 'waits', openWithoutYaku: open && ids.size === 0 };
  }
  const hand = discard ? view.hand.filter((t) => t.id !== discard.id) : view.hand;
  const ids = sortPaths(fromShape(view, hand));
  return { yaku: ids, source: 'shape', openWithoutYaku: open && ids.length === 0 };
}
