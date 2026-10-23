/**
 * Dados como o app realmente grava no Realtime Database, montados com o próprio código (não à mão).
 * Usados para conferir que as regras do banco aceitam tudo o que o app escreve: no teste comum
 * (cobertura das chaves) e no teste das regras no emulador.
 */
import {
  createMatch,
  getPlayerView,
  PRESET_YONMA,
  RULE_OPTIONS,
  type Action,
  type Tile,
} from '../../src/engine';
import {
  PROTOCOL_VERSION,
  ROOM_TTL_MS,
  summarizeMatch,
  type LobbyRequest,
  type PrivatePayload,
  type PublicPayload,
  type RoomMember,
  type RoomMeta,
  type RoomSeat,
} from '../../src/session';
import { DEFAULT_SETTINGS, settingsData } from '../../src/state/settings';

/** O banco não guarda undefined e trata listas como objetos: passa por JSON, como o app. */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Preferências padrão com todas as opções de regra preenchidas nas duas modalidades. */
export function sampleSettings(): unknown {
  const draft = Object.fromEntries(RULE_OPTIONS.map((o) => [o.id, o.default.yonma]));
  return plain(settingsData({ ...DEFAULT_SETTINGS, rules: { yonma: draft, sanma: draft } }));
}

export function sampleSummary(id = 'mabc123-xyz'): Record<string, unknown> {
  return plain(
    summarizeMatch({
      id,
      endedAt: 1,
      source: 'room',
      rules: PRESET_YONMA,
      training: false,
      result: {
        ranking: [0, 1, 2, 3],
        finalScores: [40000, 30000, 20000, 10000],
        endReason: 'tobi',
      },
      seats: [
        { kind: 'human', name: 'Ana', uid: 'ana' },
        { kind: 'bot', skill: 'normal', characterId: 'ren' },
        { kind: 'bot', skill: 'hard', characterId: 'akari' },
        { kind: 'bot', skill: 'easy', characterId: 'sora' },
      ],
      names: ['Ana', 'Ren', 'Akari', 'Sora'],
      localSeat: 0,
      wins: [
        {
          seat: 0,
          round: 'E1',
          type: 'ron',
          yaku: ['riichi', 'pinfu'],
          han: 2,
          fu: 30,
          points: 2000,
        },
        {
          seat: 0,
          round: 'S4',
          type: 'tsumo',
          yaku: ['menzenTsumo'],
          han: 1,
          fu: 40,
          points: 1300,
        },
      ],
    }),
  ) as unknown as Record<string, unknown>;
}

export function sampleMeta(hostUid: string, now = Date.now()): RoomMeta {
  return {
    hostUid,
    status: 'lobby',
    createdAt: now,
    expiresAt: now + ROOM_TTL_MS,
    mode: 'yonma',
    rules: JSON.stringify(PRESET_YONMA),
    settings: JSON.stringify({ timer: DEFAULT_SETTINGS.timer, difficulty: 'normal' }),
    protocolVersion: PROTOCOL_VERSION,
  };
}

export const sampleSeats = (hostUid: string): RoomSeat[] =>
  plain<RoomSeat[]>([
    { type: 'human', uid: hostUid, displayName: 'Ana', avatar: 'chun' },
    { type: 'bot', displayName: '', characterId: 'ren' },
    { type: 'empty', displayName: '' },
    {
      type: 'human',
      uid: 'bia',
      displayName: 'Bia',
      avatar: 'google',
      photoURL: SAMPLE_PHOTO,
      cover: 'idle',
    },
  ]);

/** Foto de conta Google como o Firebase Auth devolve. */
export const SAMPLE_PHOTO = 'https://lh3.googleusercontent.com/a/ACg8ocJ-exemplo=s96-c';

export const sampleMember = (): RoomMember => ({
  displayName: 'Bia',
  avatar: 'google',
  photoURL: SAMPLE_PHOTO,
});

export function samplePrivate(): PrivatePayload {
  const { state, events } = createMatch(PRESET_YONMA, 7);
  return {
    seq: 2,
    view: JSON.stringify(getPlayerView(state, 1)),
    events: JSON.stringify(events),
    clock: { baseMs: 5000, bankMs: 20000, hasBank: true },
    lastError: 'Ação ilegal ou fora de hora: pon',
  };
}

export const samplePublic = (): PublicPayload => ({
  seq: 2,
  phase: 'awaitingDiscard',
  scores: [25000, 25000, 25000, 25000],
  handsPlayed: 0,
});

const tile = (id: number, kind: number, red = false): Tile => ({ id, kind, red }) as Tile;

/** Uma ação de cada tipo, mais os pedidos do lobby. */
export const sampleActions = (): (Action | LobbyRequest)[] =>
  plain<(Action | LobbyRequest)[]>([
    { type: 'discard', tile: tile(4, 1) },
    { type: 'discard', tile: tile(16, 4, true), riichi: true },
    { type: 'tsumo' },
    { type: 'ron' },
    { type: 'chi', use: [tile(8, 2), tile(12, 3)] },
    { type: 'pon', use: [tile(8, 2), tile(9, 2)] },
    { type: 'daiminkan' },
    { type: 'ankan', kind: 31 as Tile['kind'] },
    { type: 'kakan', tile: tile(10, 2) },
    { type: 'kita' },
    { type: 'kyuushuKyuuhai' },
    { type: 'pass' },
    { type: 'ackSummary' },
    { type: 'claimSeat', seat: 2, name: 'Bia', avatar: 'google' },
    { type: 'leaveSeat' },
    { type: 'resume' },
  ]);
