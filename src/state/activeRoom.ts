/**
 * Última sala em que o jogador estava (spec 13.6, ADR 0020): se ele sair da partida ou cair, o menu
 * oferece voltar. Some quando a sala acaba ou é apagada.
 */
import { isRoomCode, ROOM_TTL_MS } from '../session/room';

const KEY = 'rooms:active';

export interface ActiveRoom {
  readonly code: string;
  readonly at: number;
}

export function readActiveRoom(now = Date.now()): ActiveRoom | null {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? 'null') as ActiveRoom | null;
    if (!raw || !isRoomCode(raw.code) || now - raw.at > ROOM_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

export function rememberActiveRoom(code: string): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // sem armazenamento: o menu só não oferece a volta
  }
}

/** Esquece a sala (só se for a mesma, para não apagar a de outra aba). */
export function forgetActiveRoom(code: string): void {
  try {
    if (readActiveRoom()?.code === code) globalThis.localStorage?.removeItem(KEY);
  } catch {
    // idem
  }
}
