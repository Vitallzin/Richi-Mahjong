// Testes dedicados do sanma (spec 7.13): sem chi, kita (nuki-dora), rinshan após kita, kita como
// chamada (ippatsu/chiihou/kyuushu/daburu), mão continua fechada, ron sobre kita sem chankan e muro morto.
import { PRESET_SANMA } from '../rules';
import { riggedMatch, type RiggedLayout } from '../testing/rigged';
import { parseKinds, type Tile } from '../tiles';
import type { Seat } from '../types';
import {
  applyAction,
  getLegalActions,
  type Action,
  type GameEvent,
  type MatchState,
} from './index';

const kindOf = (notation: string) => parseKinds(notation)[0] as number;
const NORTH = kindOf('4z');

let lastEvents: GameEvent[] = [];
function act(s: MatchState, seat: Seat, action: Action): MatchState {
  const r = applyAction(s, seat, action);
  lastEvents = r.events;
  return r.state;
}

function findTile(s: MatchState, seat: Seat, notation: string): Tile {
  const kind = kindOf(notation);
  const t = s.hand?.players[seat]?.hand.find((x) => x.kind === kind);
  if (!t) throw new Error(`Assento ${seat} não tem ${notation}`);
  return t;
}

const discard = (s: MatchState, seat: Seat, notation: string, riichi = false) =>
  act(s, seat, { type: 'discard', tile: findTile(s, seat, notation), riichi });

function passAll(s: MatchState): MatchState {
  let state = s;
  for (let seat = 0; seat < state.rules.players; seat++) {
    if (getLegalActions(state, seat as Seat).pass)
      state = act(state, seat as Seat, { type: 'pass' });
  }
  return state;
}

function player(s: MatchState, seat: number) {
  const p = s.hand?.players[seat];
  if (!p) throw new Error('sem jogador');
  return p;
}

const rig = (layout: RiggedLayout) => riggedMatch(PRESET_SANMA, layout);
const yakuOf = (s: MatchState) => {
  const scored = s.summary?.wins[0]?.scored;
  return scored ? [...scored.yakuman, ...scored.yaku].map((y) => y.id) : [];
};

describe('sanma: sem chi (spec 7.13)', () => {
  it('o jogador seguinte não pode fazer chi', () => {
    let s = rig({
      hands: ['19m2358p1369s235z', '1245p789s123567z', '1m6799p2457s4467z'],
      draws: '7z',
      dora: '8s',
    });
    s = discard(s, 0, '3p');
    expect(getLegalActions(s, 1).chi).toHaveLength(0);
    expect(s.phase).toBe('awaitingDiscard');
    expect(s.hand!.turn).toBe(1);
  });
});

describe('sanma: kita (nuki-dora)', () => {
  // Dealer: 123p 456p 789s 11s 9m + Norte; compra 9m; a reposição do kita (1s) completa a mão.
  const layout: RiggedLayout = {
    hands: ['123p456p789s11s9m4z', '1m2358p2369s2357z', '1m1479p2458s1567z'],
    draws: '9m',
    replacements: '1s',
    dora: '8p',
  };

  it('retira o Norte, compra do muro morto e o muro morto continua com 14', () => {
    let s = rig(layout);
    const wallBefore = s.hand!.wall.length;
    expect(getLegalActions(s, 0).kita).toBe(true);
    expect(getLegalActions(s, 1).kita).toBe(false);
    s = act(s, 0, { type: 'kita' });
    expect(lastEvents.map((e) => e.type)).toContain('KitaDeclared');
    const p = player(s, 0);
    expect(p.kita.map((t) => t.kind)).toEqual([NORTH]);
    expect(p.melds).toHaveLength(0); // não abre a mão
    expect(p.drawn?.kind).toBe(kindOf('1s'));
    const h = s.hand!;
    expect(h.turnKind).toBe('rinshan');
    expect(h.wall).toHaveLength(wallBefore - 1);
    expect(h.replacements.length + h.doraIndicators.length + h.uraIndicators.length).toBe(14);
    expect(h.doraRevealed).toBe(1); // kita não revela dora
  });

  it('tsumo na reposição do kita é rinshan; a mão segue fechada (menzen tsumo)', () => {
    let s = rig(layout);
    s = act(s, 0, { type: 'kita' });
    expect(getLegalActions(s, 0).tsumo).toBe(true);
    s = act(s, 0, { type: 'tsumo' });
    const yaku = yakuOf(s);
    expect(yaku).toEqual(expect.arrayContaining(['rinshan', 'menzenTsumo']));
    expect(yaku).not.toContain('tenhou');
    expect(yaku).not.toContain('haitei');
    expect(s.summary!.wins[0]!.scored.kita).toBe(1);
  });

  it('ron sobre a declaração de kita é permitido, sem chankan; passar dá furiten temporário', () => {
    const robbery: RiggedLayout = {
      hands: ['19m25p1369s2357z4z', '123p456p789p99p44z', '1m36p245789s1567z'],
      draws: '6z',
      dora: '8s',
    };
    let s = rig(robbery);
    s = act(s, 0, { type: 'kita' });
    expect(s.phase).toBe('awaitingRobbery');
    expect(getLegalActions(s, 1).ron).toBe(true);
    expect(getLegalActions(s, 2).ron).toBe(false);
    const won = act(s, 1, { type: 'ron' });
    const yaku = yakuOf(won);
    expect(yaku).toEqual(expect.arrayContaining(['honitsu', 'ittsu']));
    expect(yaku).not.toContain('chankan');
    expect(won.summary!.wins[0]).toMatchObject({ seat: 1, from: 0, winType: 'ron' });

    const passed = act(s, 1, { type: 'pass' });
    expect(player(passed, 1).furiten.temporary).toBe(true);
    expect(player(passed, 0).furiten.temporary).toBe(false); // quem declara não fica furiten
    expect(passed.hand!.turnKind).toBe('rinshan');
  });
});

describe('sanma: kita conta como chamada (spec 7.13)', () => {
  // Assento 1 espera 5p (tanki, tanyao); o dealer pode declarar kita antes de descartar.
  const tenpai = '234p345p456s678s5p';
  const base = (draws: string): RiggedLayout => ({
    hands: ['19m19p1239s2357z4z', tenpai, '9m1678p2379s1567z'],
    draws,
    dora: '3s',
  });

  it('impede chiihou', () => {
    let s = rig(base('6z5p'));
    s = discard(s, 0, '6z');
    s = act(s, 1, { type: 'tsumo' });
    expect(yakuOf(s)).toContain('chiihou');

    s = rig(base('6z5p'));
    s = act(s, 0, { type: 'kita' });
    s = discard(s, 0, '6z');
    s = passAll(s);
    s = act(s, 1, { type: 'tsumo' });
    expect(yakuOf(s)).not.toContain('chiihou');
    expect(yakuOf(s)).toEqual(expect.arrayContaining(['tanyao', 'menzenTsumo']));
  });

  it('impede daburu riichi', () => {
    let s = rig(base('6z1z'));
    s = discard(s, 0, '6z');
    s = discard(s, 1, '1z', true);
    s = passAll(s);
    expect(player(s, 1).riichi).toMatchObject({ established: true, double: true });

    s = rig(base('6z1z'));
    s = act(s, 0, { type: 'kita' });
    s = discard(s, 0, '6z');
    s = passAll(s);
    s = discard(s, 1, '1z', true);
    s = passAll(s);
    expect(player(s, 1).riichi).toMatchObject({ established: true, double: false });
  });

  it('impede kyuushu kyuuhai', () => {
    const layout: RiggedLayout = {
      hands: ['23458p23678s467z', '19m19p19s1235z456s', '9m1679p1459s1567z'],
      draws: '7z5p',
      dora: '3s',
    };
    let s = rig(layout);
    s = discard(s, 0, '7z');
    s = passAll(s);
    expect(getLegalActions(s, 1).kyuushuKyuuhai).toBe(true);

    s = rig(layout);
    s = act(s, 0, { type: 'kita' });
    s = discard(s, 0, '7z');
    s = passAll(s);
    expect(getLegalActions(s, 1).kyuushuKyuuhai).toBe(false);
  });

  it('quebra o ippatsu de quem está em riichi', () => {
    // Assento 1 entra em riichi; o dealer declara kita na volta seguinte; o tsumo de 1 vem sem ippatsu.
    const layout: RiggedLayout = {
      hands: ['19m19p1239s2357z4z', tenpai, '9m1678p2379s1567z'],
      draws: '6z1z7z6s5p',
      dora: '3s',
    };
    let s = rig(layout);
    s = discard(s, 0, '6z');
    s = passAll(s);
    s = discard(s, 1, '1z', true);
    s = passAll(s);
    s = discard(s, 2, '7z');
    s = passAll(s);
    s = act(s, 0, { type: 'kita' });
    s = discard(s, 0, '6s');
    s = passAll(s);
    expect(player(s, 1).riichi?.ippatsu).toBe(false);
    s = act(s, 1, { type: 'tsumo' });
    expect(yakuOf(s)).not.toContain('ippatsu');
    expect(yakuOf(s)).toContain('doubleRiichi');
  });
});
