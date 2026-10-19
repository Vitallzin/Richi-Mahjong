/**
 * Salas privadas no Realtime Database (spec 13.3): o banco é só canal de mensagens e presença.
 * O anfitrião escreve meta/assentos/visões; cada convidado escreve só o próprio inbox e presença.
 */
import {
  get,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type DatabaseReference,
} from 'firebase/database';
import type { Action } from '../engine';
import {
  generateRoomCode,
  PROTOCOL_VERSION,
  ROOM_TTL_MS,
  type HostUpdate,
  type InboxMessage,
  type LobbyRequest,
  type PrivatePayload,
  type RoomMeta,
  type RoomSeat,
  type RoomStatus,
} from '../session';
import { firebaseDatabase } from './firebase';

const roomRef = (code: string, path = ''): DatabaseReference =>
  ref(firebaseDatabase(), `rooms/${code}${path ? `/${path}` : ''}`);

/** Salas criadas por este anfitrião neste aparelho (para a limpeza, 13.8). */
const MINE_KEY = 'rooms:mine';
const myRooms = (): string[] => {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(MINE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};
const setMyRooms = (codes: readonly string[]) => {
  try {
    globalThis.localStorage?.setItem(MINE_KEY, JSON.stringify(codes));
  } catch {
    // sem armazenamento: só não limpa salas antigas
  }
};

export async function readMeta(code: string): Promise<RoomMeta | null> {
  const snap = await get(roomRef(code, 'meta'));
  return snap.exists() ? (snap.val() as RoomMeta) : null;
}

/** Cria a sala com o anfitrião sentado no assento 0; apaga as salas antigas dele. */
export async function createRoom(
  hostUid: string,
  host: { readonly displayName: string; readonly avatar: string },
  config: {
    readonly rules: string;
    readonly settings: string;
    readonly mode: RoomMeta['mode'];
    readonly players: number;
  },
): Promise<string> {
  for (const old of myRooms()) {
    await remove(roomRef(old)).catch(() => undefined);
  }
  let code = generateRoomCode();
  for (let i = 0; i < 5 && (await readMeta(code).catch(() => null)); i++) code = generateRoomCode();
  const now = Date.now();
  const meta: RoomMeta = {
    hostUid,
    status: 'lobby',
    createdAt: now,
    expiresAt: now + ROOM_TTL_MS,
    mode: config.mode,
    rules: config.rules,
    settings: config.settings,
    protocolVersion: PROTOCOL_VERSION,
  };
  await set(roomRef(code, 'meta'), meta);
  await set(roomRef(code, `members/${hostUid}`), true);
  const seats: RoomSeat[] = Array.from({ length: config.players }, (_, i) =>
    i === 0
      ? { type: 'human', uid: hostUid, displayName: host.displayName, avatar: host.avatar }
      : { type: 'empty', displayName: '' },
  );
  await set(roomRef(code, 'seats'), seats);
  setMyRooms([code]);
  return code;
}

export const writeSeats = (code: string, seats: readonly RoomSeat[]): Promise<void> =>
  set(roomRef(code, 'seats'), JSON.parse(JSON.stringify(seats)) as unknown);

export const setStatus = (code: string, status: RoomStatus): Promise<void> =>
  update(roomRef(code, 'meta'), { status });

/** Encerra a sala: o anfitrião apaga tudo (13.8). */
export async function deleteRoom(code: string): Promise<void> {
  await remove(roomRef(code));
  setMyRooms(myRooms().filter((c) => c !== code));
}

/** Entra como membro (só no lobby; quem já é membro pode reconectar durante a partida). */
export async function joinRoom(code: string, uid: string): Promise<void> {
  await set(roomRef(code, `members/${uid}`), true);
}

/** Presença com onDisconnect (13.6); refeita a cada reconexão. Devolve a função para sair. */
export function trackPresence(code: string, uid: string): () => void {
  const me = roomRef(code, `presence/${uid}`);
  const connected = ref(firebaseDatabase(), '.info/connected');
  const stop = onValue(connected, (snap) => {
    if (snap.val() !== true) return;
    void onDisconnect(me)
      .remove()
      .then(() => set(me, true));
  });
  return () => {
    stop();
    void remove(me).catch(() => undefined);
  };
}

export function watchMeta(code: string, cb: (meta: RoomMeta | null) => void): () => void {
  return onValue(roomRef(code, 'meta'), (s) => cb(s.exists() ? (s.val() as RoomMeta) : null));
}

export function watchSeats(code: string, cb: (seats: RoomSeat[]) => void): () => void {
  return onValue(roomRef(code, 'seats'), (s) => {
    const raw = s.val() as RoomSeat[] | Record<string, RoomSeat> | null;
    cb(raw ? Object.values(raw) : []);
  });
}

/** Quem está online agora (uids). */
export function watchPresence(code: string, cb: (online: ReadonlySet<string>) => void): () => void {
  return onValue(roomRef(code, 'presence'), (s) =>
    cb(new Set(Object.keys((s.val() as Record<string, true> | null) ?? {}))),
  );
}

// ---------- anfitrião ----------

/** Lê os inboxes de todos; cada mensagem é entregue uma vez e apagada (13.4). */
export function watchInbox(code: string, cb: (msg: InboxMessage) => void): () => void {
  return onValue(roomRef(code, 'inbox'), (s) => {
    const all = (s.val() as Record<string, Record<string, Omit<InboxMessage, 'uid'>>> | null) ?? {};
    const removals: Record<string, null> = {};
    const messages: InboxMessage[] = [];
    for (const [uid, box] of Object.entries(all)) {
      for (const [id, m] of Object.entries(box)) {
        messages.push({ uid, clientSeq: m.clientSeq, action: m.action });
        removals[`inbox/${uid}/${id}`] = null;
      }
    }
    if (messages.length === 0) return;
    messages.sort((a, b) => a.clientSeq - b.clientSeq);
    void update(roomRef(code), removals);
    for (const m of messages) cb(m);
  });
}

/** Uma escrita multi-caminho atômica por atualização: visões privadas + placar público (13.3). */
export function publishHostUpdate(code: string, u: HostUpdate): Promise<void> {
  const changes: Record<string, unknown> = { public: u.public };
  for (const [uid, payload] of Object.entries(u.privates)) changes[`private/${uid}`] = payload;
  return update(roomRef(code), changes);
}

// ---------- convidado ----------

export function watchPrivate(
  code: string,
  uid: string,
  cb: (payload: PrivatePayload) => void,
): () => void {
  return onValue(roomRef(code, `private/${uid}`), (s) => {
    if (s.exists()) cb(s.val() as PrivatePayload);
  });
}

export function sendToInbox(
  code: string,
  uid: string,
  action: Action | LobbyRequest,
  clientSeq: number,
): Promise<void> {
  return set(push(roomRef(code, `inbox/${uid}`)), {
    clientSeq,
    action: JSON.parse(JSON.stringify(action)) as unknown,
    ts: serverTimestamp(),
  }).then(() => undefined);
}
