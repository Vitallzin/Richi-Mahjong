/**
 * Autosave da partida solo (spec 5.6): estado completo + regras + assentos em localStorage, versionado.
 * Saves de outra versão são descartados com aviso.
 */
import type { MatchState, Seat } from '../engine';
import type { MatchSettings, SeatSetup } from './types';

export const SAVE_KEY = 'match:v1';
export const SAVE_SCHEMA_VERSION = 1;

export interface MatchSnapshot {
  readonly schemaVersion: number;
  readonly savedAt: number;
  readonly state: MatchState;
  readonly settings: MatchSettings;
  readonly seats: readonly SeatSetup[];
  readonly localSeat: Seat;
  /** Banco de tempo restante por assento humano (ms). */
  readonly banks: Partial<Record<Seat, number>>;
}

export type LoadResult =
  | { readonly status: 'none' }
  | { readonly status: 'incompatible' }
  | { readonly status: 'ok'; readonly snapshot: MatchSnapshot };

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const defaultStore = (): KeyValueStore | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export function saveMatch(snapshot: MatchSnapshot, store = defaultStore()): void {
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(snapshot));
  } catch {
    // Armazenamento cheio ou bloqueado: o jogo continua, só não há autosave.
  }
}

export function loadMatch(store = defaultStore()): LoadResult {
  let raw: string | null;
  try {
    raw = store?.getItem(SAVE_KEY) ?? null;
  } catch {
    return { status: 'none' };
  }
  if (!raw) return { status: 'none' };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { schemaVersion?: unknown }).schemaVersion !== SAVE_SCHEMA_VERSION ||
      (parsed as { state?: { schemaVersion?: unknown } }).state?.schemaVersion !== 1
    ) {
      return { status: 'incompatible' };
    }
    const snapshot = parsed as MatchSnapshot;
    if (snapshot.state.phase === 'matchEnded') return { status: 'none' };
    return { status: 'ok', snapshot };
  } catch {
    return { status: 'incompatible' };
  }
}

export function clearMatch(store = defaultStore()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    // ignora
  }
}
