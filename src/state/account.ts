/**
 * Conta (spec 12): estado do login na interface, perfil, migração das preferências locais (12.3),
 * sincronização das preferências e histórico. O Firebase só é carregado quando o jogador entra (ou
 * quando já tinha entrado neste aparelho), via import dinâmico.
 */
import { create } from 'zustand';
import type { AccountUser, Profile } from '../net/account';
import { idsToPrune, normalizeSummary, type MatchSummary } from '../session/history';
import {
  DEFAULT_SETTINGS,
  isCustomized,
  mergeSettings,
  settingsData,
  useSettings,
} from './settings';
import { DEFAULT_AVATAR, GOOGLE_AVATAR, sanitizeDisplayName } from './profile';

export type AccountStatus = 'guest' | 'loading' | 'signedIn';

interface AccountState {
  readonly status: AccountStatus;
  readonly user: AccountUser | null;
  readonly profile: Profile | null;
  /** Primeiro login com preferências locais: perguntar se vão para a conta (12.3). */
  readonly askMigration: boolean;
  readonly error: string | null;
}

/** Já entrou neste aparelho: restaura a sessão do Firebase ao abrir o site. */
const HINT_KEY = 'account:hint';
/** Preferências já resolvidas (migradas ou não) para este uid neste aparelho. */
const migratedKey = (uid: string) => `account:migrated:${uid}`;

const storage = {
  get: (k: string) => {
    try {
      return globalThis.localStorage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) globalThis.localStorage?.removeItem(k);
      else globalThis.localStorage?.setItem(k, v);
    } catch {
      // armazenamento bloqueado: só perde a lembrança do login
    }
  },
};

export const useAccount = create<AccountState>()(() => ({
  status: 'guest',
  user: null,
  profile: null,
  askMigration: false,
  error: null,
}));

const net = () => import('../net/account');

let unwatch: (() => void) | null = null;
let stopSync: (() => void) | null = null;
let remoteSettings: unknown = null;

function startSync(uid: string): void {
  stopSync?.();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsub = useSettings.subscribe((state) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void net().then((n) => n.writeSettings(uid, settingsData(state)));
    }, 800);
  });
  stopSync = () => {
    if (timer) clearTimeout(timer);
    unsub();
    stopSync = null;
  };
}

function applyRemote(remote: unknown): void {
  const data = mergeSettings(DEFAULT_SETTINGS, remote);
  useSettings.setState({ ...data, welcomeSeen: useSettings.getState().welcomeSeen });
}

async function onSignedIn(user: AccountUser): Promise<void> {
  const n = await net();
  storage.set(HINT_KEY, '1');
  let profile = await n.readProfile(user.uid);
  if (!profile) {
    profile = {
      displayName: sanitizeDisplayName(user.displayName) || 'Jogador',
      avatar: user.photoURL ? GOOGLE_AVATAR : DEFAULT_AVATAR,
    };
    await n.writeProfile(user.uid, profile);
  }
  remoteSettings = await n.readSettings(user.uid);
  const resolved = storage.get(migratedKey(user.uid)) === '1';
  const local = useSettings.getState();
  if (!resolved && isCustomized(local)) {
    useAccount.setState({ status: 'signedIn', user, profile, askMigration: true, error: null });
    return;
  }
  if (remoteSettings) applyRemote(remoteSettings);
  else await n.writeSettings(user.uid, settingsData(local));
  storage.set(migratedKey(user.uid), '1');
  useAccount.setState({ status: 'signedIn', user, profile, askMigration: false, error: null });
  startSync(user.uid);
}

function watch(): void {
  if (unwatch) return;
  void net().then((n) => {
    unwatch = n.watchAuth((user) => {
      if (!user) {
        stopSync?.();
        storage.set(HINT_KEY, null);
        useAccount.setState({ status: 'guest', user: null, profile: null, askMigration: false });
        return;
      }
      useAccount.setState({ status: 'loading' });
      onSignedIn(user).catch((e: unknown) => {
        useAccount.setState({ status: 'signedIn', user, error: String(e) });
      });
    });
  });
}

/** Chamado ao abrir o site: só carrega o Firebase se o jogador já tinha entrado aqui. */
export function initAccount(): void {
  if (storage.get(HINT_KEY) === '1') {
    useAccount.setState({ status: 'loading' });
    watch();
  }
}

export async function signIn(): Promise<void> {
  useAccount.setState({ error: null });
  watch();
  try {
    await (await net()).signInWithGoogle();
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    // Fechar a janela do Google não é erro.
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
      useAccount.setState({ error: code || String(e) });
  }
}

/** Desenvolvimento com emuladores: entra como jogador de teste (ver net/account). */
export async function devSignIn(uid: string, name: string): Promise<void> {
  watch();
  await (await net()).signInTestUser(uid, name);
}

export async function signOut(): Promise<void> {
  stopSync?.();
  await (await net()).signOut();
}

/** Resposta à pergunta "Levar suas configurações atuais para a conta?" (12.3). */
export async function answerMigration(bring: boolean): Promise<void> {
  const { user } = useAccount.getState();
  if (!user) return;
  const n = await net();
  if (bring) await n.writeSettings(user.uid, settingsData(useSettings.getState()));
  else if (remoteSettings) applyRemote(remoteSettings);
  else useSettings.setState({ ...DEFAULT_SETTINGS, welcomeSeen: true });
  storage.set(migratedKey(user.uid), '1');
  useAccount.setState({ askMigration: false });
  startSync(user.uid);
}

export async function saveProfile(patch: Partial<Profile>): Promise<void> {
  const { user, profile } = useAccount.getState();
  if (!user || !profile) return;
  const next: Profile = {
    displayName:
      patch.displayName !== undefined
        ? sanitizeDisplayName(patch.displayName) || profile.displayName
        : profile.displayName,
    avatar: patch.avatar ?? profile.avatar,
  };
  await (await net()).writeProfile(user.uid, next);
  useAccount.setState({ profile: next });
}

/** "Apagar meus dados" (12.6): remove users/{uid} e sai. */
export async function deleteMyData(): Promise<void> {
  const { user } = useAccount.getState();
  if (!user) return;
  stopSync?.();
  const n = await net();
  await n.deleteUserData(user.uid);
  storage.set(migratedKey(user.uid), null);
  await n.signOut();
}

export async function loadHistory(): Promise<MatchSummary[]> {
  const { user } = useAccount.getState();
  if (!user) return [];
  const raw = await (await net()).readHistory(user.uid);
  return raw
    .map(normalizeSummary)
    .filter((m): m is MatchSummary => m !== null)
    .sort((a, b) => b.endedAt - a.endedAt);
}

/** Grava o resumo de uma partida (se logado), mantendo as 100 mais recentes. */
export async function recordMatch(summary: MatchSummary): Promise<void> {
  const { user } = useAccount.getState();
  if (!user) return;
  const n = await net();
  const existing = (await n.readHistory(user.uid))
    .map(normalizeSummary)
    .filter((m): m is MatchSummary => m !== null);
  const prune = idsToPrune([...existing, summary]).filter((id) => id !== summary.id);
  await n.writeHistory(
    user.uid,
    summary as unknown as { id: string } & Record<string, unknown>,
    prune,
  );
}
