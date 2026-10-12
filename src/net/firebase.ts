/**
 * Inicialização do Firebase (spec 3 e 12). Preguiçosa: nada é carregado até o primeiro uso, para que o
 * modo convidado (solo, sem login) funcione offline e sem rede.
 * Sem Analytics: a spec 12.6 proíbe analytics de terceiros.
 */
import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

function readConfig(): FirebaseOptions {
  const env = import.meta.env;
  const config: FirebaseOptions = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  };
  const missing = Object.entries(config).filter(([, v]) => typeof v !== 'string' || v === '');
  if (missing.length > 0) {
    throw new Error(`Configuração do Firebase incompleta: ${missing.map(([k]) => k).join(', ')}`);
  }
  return config;
}

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp {
  app ??= initializeApp(readConfig());
  return app;
}

export const firebaseAuth = (): Auth => getAuth(firebaseApp());
export const firebaseDatabase = (): Database => getDatabase(firebaseApp());

/** Provedor Google (o único método de login; login anônimo não é usado — spec 12.2). */
export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}
