/** Janelas de decisão (spec 10.5) montadas a partir das ações legais da PlayerView. */
import { isYaochu, type Action, type PlayerView, type Tile as TileData } from '../../engine';
import { t } from '../../i18n';
import type { DecisionOption } from '../components/DecisionDialog';
import type { ActionKey } from './actions';

export interface Dialog {
  readonly title: string;
  readonly description?: string;
  readonly options: readonly DecisionOption[];
  readonly actions: Readonly<Record<string, Action>>;
}

const uniqueTiles = (tiles: readonly TileData[]) => {
  const seen = new Map<string, TileData>();
  for (const x of tiles) if (!seen.has(`${x.kind}:${x.red}`)) seen.set(`${x.kind}:${x.red}`, x);
  return [...seen.values()];
};

export function buildDialog(kind: ActionKey, view: PlayerView): Dialog | Action {
  const legal = view.legal;
  const call = view.callTile?.tile;
  const pairOptions = (
    title: string,
    type: 'pon' | 'chi',
    uses: readonly (readonly [TileData, TileData])[],
  ): Dialog | Action => {
    const first = uses[0];
    if (uses.length === 1 && first) return { type, use: [first[0], first[1]] };
    const options: DecisionOption[] = [];
    const actions: Record<string, Action> = {};
    uses.forEach((use, i) => {
      const key = `${type}-${i}`;
      options.push({
        key,
        tiles: call ? [...use, call].sort((a, b) => a.kind - b.kind) : [...use],
      });
      actions[key] = { type, use: [use[0], use[1]] };
    });
    return { title, options, actions };
  };
  switch (kind) {
    case 'pon':
      return pairOptions(t('decision.pon'), 'pon', legal.pon);
    case 'chi':
      return pairOptions(t('decision.chi'), 'chi', legal.chi);
    case 'riichi': {
      const tiles = uniqueTiles(legal.riichi);
      const options = tiles.map((tile) => ({ key: `r-${tile.id}`, tiles: [tile] }));
      const actions = Object.fromEntries(
        tiles.map((tile) => [`r-${tile.id}`, { type: 'discard', tile, riichi: true } as Action]),
      );
      return {
        title: t('decision.riichi'),
        description: t('decision.riichiHint'),
        options,
        actions,
      };
    }
    case 'kan': {
      const options: DecisionOption[] = [];
      const actions: Record<string, Action> = {};
      if (legal.daiminkan && call) {
        options.push({
          key: 'daiminkan',
          tiles: [...view.hand.filter((x) => x.kind === call.kind), call],
        });
        actions.daiminkan = { type: 'daiminkan' };
      }
      for (const k of legal.ankan) {
        options.push({ key: `ankan-${k}`, tiles: view.hand.filter((x) => x.kind === k) });
        actions[`ankan-${k}`] = { type: 'ankan', kind: k };
      }
      for (const tile of legal.kakan) {
        const meld = view.players[view.seat]?.melds.find(
          (m) => m.type === 'pon' && m.called.kind === tile.kind,
        );
        options.push({ key: `kakan-${tile.id}`, tiles: [...(meld?.tiles ?? []), tile] });
        actions[`kakan-${tile.id}`] = { type: 'kakan', tile };
      }
      const only = options[0];
      if (options.length === 1 && only) return actions[only.key] as Action;
      return { title: t('decision.kan'), options, actions };
    }
    case 'kyuushu': {
      const tiles = uniqueTiles(view.hand.filter((x) => isYaochu(x.kind)));
      return {
        title: t('action.kyuushu'),
        description: t('decision.kyuushu'),
        options: [{ key: 'yes', tiles, label: t('action.confirm') }],
        actions: { yes: { type: 'kyuushuKyuuhai' } },
      };
    }
    case 'tsumo':
      return { type: 'tsumo' };
    case 'ron':
      return { type: 'ron' };
    case 'kita':
      return { type: 'kita' };
    case 'pass':
      return { type: 'pass' };
  }
}

export const isAction = (x: Dialog | Action): x is Action => 'type' in x;
