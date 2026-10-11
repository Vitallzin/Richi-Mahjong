/**
 * Pontuação de uma mão vencedora: calcula todas as leituras (decomposições × posição da peça
 * vencedora) e escolhe a de maior pontuação; desempate por mais han, depois mais fu (spec 7.9).
 */
import { decompositions, type Decomposition } from '../hand';
import { doraFromIndicator, NORTH, toCounts, type TileKind } from '../tiles';
import { isOpenMeld, meldKind, type Meld } from '../types';
import {
  ALL_YAKU,
  type Group,
  type WaitType,
  type WinInput,
  type YakuContext,
  type YakuId,
} from '../yaku';
import { computeFu } from './fu';
import { basicPoints, type LimitName } from './points';

export interface YakuScore {
  readonly id: YakuId;
  /** Han (yaku normal) ou multiplicador (yakuman). */
  readonly value: number;
}

export interface ScoredHand {
  readonly form: YakuContext['form'];
  readonly wait: WaitType;
  /** Yaku normais (vazio quando há yakuman). */
  readonly yaku: readonly YakuScore[];
  /** Yakuman com seus multiplicadores (vazio quando não há). */
  readonly yakuman: readonly YakuScore[];
  readonly yakuHan: number;
  readonly dora: number;
  readonly aka: number;
  readonly ura: number;
  /** Nuki-dora (quantidade de kita). Norte que também é dora entra em `dora`/`ura`. */
  readonly kita: number;
  /** Han total (yaku + dora). 0 em yakuman. */
  readonly han: number;
  readonly fu: number;
  readonly base: number;
  readonly limit: LimitName;
  readonly yakumanMultiplier: number;
  readonly kazoe: boolean;
}

function meldGroup(meld: Meld): Group {
  const kind = meldKind(meld);
  switch (meld.type) {
    case 'chi':
      return { type: 'seq', kind, open: true, concealed: false };
    case 'pon':
      return { type: 'trip', kind, open: true, concealed: false };
    case 'ankan':
      return { type: 'quad', kind, open: false, concealed: true };
    default:
      return { type: 'quad', kind, open: true, concealed: false };
  }
}

interface Reading {
  readonly form: YakuContext['form'];
  readonly groups: readonly Group[];
  readonly pair: TileKind | null;
  readonly wait: WaitType;
}

function seqWait(start: TileKind, win: TileKind): WaitType {
  const offset = win - start;
  const n = start % 9; // 0 = sequência 123
  if (offset === 1) return 'kanchan';
  if (offset === 0) return n === 6 ? 'penchan' : 'ryanmen';
  return n === 0 ? 'penchan' : 'ryanmen';
}

/** Leituras de uma decomposição: uma para cada lugar onde a peça vencedora pode ter entrado. */
function readingsOf(
  dec: Decomposition,
  winKind: TileKind,
  isRon: boolean,
  meldGroups: readonly Group[],
): Reading[] {
  if (dec.form === 'chiitoitsu')
    return [{ form: 'chiitoitsu', groups: [], pair: null, wait: 'tanki' }];
  if (dec.form === 'kokushi') {
    return [
      {
        form: 'kokushi',
        groups: [],
        pair: dec.pair,
        wait: dec.pair === winKind ? 'kokushi13' : 'tanki',
      },
    ];
  }
  const closedGroups = (ronIndex: number): Group[] =>
    dec.sets.map((s, i) => ({
      type: s.type,
      kind: s.kind,
      open: false,
      concealed: s.type === 'trip' && !(isRon && i === ronIndex),
    }));

  const out: Reading[] = [];
  if (dec.pair === winKind) {
    out.push({
      form: 'regular',
      groups: [...closedGroups(-1), ...meldGroups],
      pair: dec.pair,
      wait: 'tanki',
    });
  }
  dec.sets.forEach((s, i) => {
    if (s.type === 'trip' && s.kind === winKind) {
      out.push({
        form: 'regular',
        groups: [...closedGroups(i), ...meldGroups],
        pair: dec.pair,
        wait: 'shanpon',
      });
    } else if (s.type === 'seq' && winKind >= s.kind && winKind <= s.kind + 2) {
      out.push({
        form: 'regular',
        groups: [...closedGroups(-1), ...meldGroups],
        pair: dec.pair,
        wait: seqWait(s.kind, winKind),
      });
    }
  });
  return out;
}

const countDora = (
  counts: readonly number[],
  indicators: readonly TileKind[],
  input: WinInput,
): number => {
  let n = 0;
  for (const indicator of indicators) {
    const dora = doraFromIndicator(indicator, input.rules.mode);
    n += counts[dora] as number;
    if (dora === NORTH) n += input.kitaCount;
  }
  return n;
};

function better(a: ScoredHand, b: ScoredHand | null): boolean {
  if (b === null) return true;
  if (a.base !== b.base) return a.base > b.base;
  if (a.han !== b.han) return a.han > b.han;
  return a.fu > b.fu;
}

/**
 * Pontua a mão. Retorna `null` se não houver leitura completa com ao menos um yaku
 * (dora, aka, ura e kita não são yaku).
 */
export function scoreHand(input: WinInput): ScoredHand | null {
  const concealedCounts = toCounts(input.concealed);
  const allTiles = [...input.concealed, ...input.melds.flatMap((m) => m.tiles)];
  const counts = toCounts(allTiles);
  const closed = !input.melds.some(isOpenMeld);
  const meldGroups = input.melds.map(meldGroup);
  const winKind = input.winTile.kind;
  const isRon = input.winType === 'ron';

  const doraCount = countDora(counts, input.doraIndicators, input);
  const aka = allTiles.filter((t) => t.red).length;
  const ura = input.riichi !== 'none' ? countDora(counts, input.uraIndicators, input) : 0;

  let best: ScoredHand | null = null;
  for (const dec of decompositions(concealedCounts, input.melds.length)) {
    for (const reading of readingsOf(dec, winKind, isRon, meldGroups)) {
      const ctx: YakuContext = {
        win: input,
        rules: input.rules,
        form: reading.form,
        closed,
        groups: reading.groups,
        pair: reading.pair,
        wait: reading.wait,
        winKind,
        counts,
      };
      const yaku: YakuScore[] = [];
      const yakuman: YakuScore[] = [];
      for (const def of ALL_YAKU) {
        const value = def.evaluate(ctx);
        if (value > 0) (def.kind === 'yakuman' ? yakuman : yaku).push({ id: def.id, value });
      }
      let scored: ScoredHand;
      if (yakuman.length > 0) {
        const mult = yakuman.reduce((a, y) => a + y.value, 0);
        const points = basicPoints(0, 0, mult, input.rules);
        scored = {
          form: reading.form,
          wait: reading.wait,
          yaku: [],
          yakuman,
          yakuHan: 0,
          dora: 0,
          aka: 0,
          ura: 0,
          kita: 0,
          han: 0,
          fu: 0,
          ...points,
        };
      } else {
        if (yaku.length === 0) continue;
        const yakuHan = yaku.reduce((a, y) => a + y.value, 0);
        const han = yakuHan + doraCount + aka + ura + input.kitaCount;
        const fu = computeFu(
          ctx,
          yaku.some((y) => y.id === 'pinfu'),
        );
        scored = {
          form: reading.form,
          wait: reading.wait,
          yaku,
          yakuman: [],
          yakuHan,
          dora: doraCount,
          aka,
          ura,
          kita: input.kitaCount,
          han,
          fu,
          ...basicPoints(han, fu, 0, input.rules),
        };
      }
      if (better(scored, best)) best = scored;
    }
  }
  return best;
}

/** A mão atinge o han mínimo da regra (yakuman sempre atinge). */
export const meetsHanMinimum = (scored: ScoredHand, hanMinimum: number): boolean =>
  scored.yakumanMultiplier > 0 || scored.han >= hanMinimum;
