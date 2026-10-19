/**
 * Conta Google e dados do jogador no Realtime Database (spec 12): login, perfil, preferências e
 * histórico em `users/{uid}`. Carregado sob demanda (import dinâmico): quem joga sem login nunca
 * baixa o Firebase.
 */
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { get, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { emulatorsEnabled, firebaseAuth, firebaseDatabase, googleProvider } from './firebase';

export interface AccountUser {
  readonly uid: string;
  readonly displayName: string;
  readonly photoURL: string | null;
}

export interface Profile {
  readonly displayName: string;
  /** Id de avatar temático, ou "google" para usar a foto da conta. */
  readonly avatar: string;
}

const toUser = (u: User): AccountUser => ({
  uid: u.uid,
  displayName: u.displayName ?? '',
  photoURL: u.photoURL,
});

/** Observa o login; devolve a função para parar de observar. */
export function watchAuth(cb: (user: AccountUser | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth(), (u) => cb(u ? toUser(u) : null));
}

export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(firebaseAuth(), googleProvider());
  } catch (e) {
    // Navegadores que bloqueiam popup (alguns celulares): login por redirecionamento.
    const code = (e as { code?: string }).code;
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    )
      await signInWithRedirect(firebaseAuth(), googleProvider());
    else throw e;
  }
}

export const signOut = (): Promise<void> => fbSignOut(firebaseAuth());

/**
 * Só com os emuladores: entra com uma conta Google de teste (o emulador aceita credencial sem
 * assinatura). Usado para testar salas com vários jogadores em abas diferentes.
 */
export async function signInTestUser(uid: string, name: string): Promise<void> {
  if (!emulatorsEnabled()) throw new Error('Login de teste só funciona com os emuladores');
  const token = JSON.stringify({
    sub: uid,
    email: `${uid}@example.com`,
    email_verified: true,
    name,
  });
  await signInWithCredential(firebaseAuth(), GoogleAuthProvider.credential(token));
}

const userRef = (uid: string, path = '') =>
  ref(firebaseDatabase(), `users/${uid}${path ? `/${path}` : ''}`);

export async function readProfile(uid: string): Promise<Profile | null> {
  const snap = await get(userRef(uid, 'profile'));
  return snap.exists() ? (snap.val() as Profile) : null;
}

export const writeProfile = (uid: string, profile: Profile): Promise<void> =>
  set(userRef(uid, 'profile'), profile);

export async function readSettings(uid: string): Promise<unknown> {
  const snap = await get(userRef(uid, 'settings'));
  return snap.exists() ? snap.val() : null;
}

/** Grava as preferências (o banco não aceita NaN/undefined: passa por JSON). */
export const writeSettings = (uid: string, data: unknown): Promise<void> =>
  set(userRef(uid, 'settings'), JSON.parse(JSON.stringify(data)) as unknown);

/** Lista o histórico (até 100 resumos). */
export async function readHistory(uid: string): Promise<unknown[]> {
  const snap = await get(userRef(uid, 'history'));
  if (!snap.exists()) return [];
  return Object.values(snap.val() as Record<string, unknown>);
}

/**
 * Grava um resumo de partida; `endedAt` vem do relógio do servidor (as regras exigem ≤ now).
 * `prune` são ids antigos a remover na mesma escrita.
 */
export async function writeHistory(
  uid: string,
  summary: { readonly id: string } & Record<string, unknown>,
  prune: readonly string[] = [],
): Promise<void> {
  const changes: Record<string, unknown> = {
    [summary.id]: {
      ...(JSON.parse(JSON.stringify(summary)) as object),
      endedAt: serverTimestamp(),
    },
  };
  for (const id of prune) changes[id] = null;
  await update(userRef(uid, 'history'), changes);
}

/** "Apagar meus dados" (spec 12.6): remove tudo em users/{uid}. */
export const deleteUserData = (uid: string): Promise<void> => remove(userRef(uid));
