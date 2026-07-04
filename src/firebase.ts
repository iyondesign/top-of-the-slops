/**
 * Firebase bootstrap — project `top-of-the-slops` (the owner's Google
 * Cloud project; same one that later carries the conductor + Gemini
 * functions).
 *
 * The web config below is CLIENT config, public by design (Firebase's
 * security lives in the Auth + database rules in firebase/, not in these
 * identifiers) — safe to commit. EXPO_PUBLIC_FIREBASE_* env vars override
 * per-environment.
 *
 * Two-stage activation:
 * - Identity/auth (anonymous + Keep-your-cred) run on Firebase as soon as
 *   the console has the providers enabled; failures fall back to the
 *   local profile so the app never blocks on backend state.
 * - The LIVE room (RTDB channel, Firestore chat, presence, votes) stays
 *   on the stub until EXPO_PUBLIC_LIVE_CHANNEL=1 — flip it once the
 *   conductor is deployed and writing /channels/global/state, otherwise
 *   the hero would wait forever on a timeline nothing writes.
 */

const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyBhX7QIodypF6tNnUfCW2kmGB2BcYOTQbs',
  authDomain: 'top-of-the-slops.firebaseapp.com',
  projectId: 'top-of-the-slops',
  // Default-region guess; if RTDB is created in another region, set
  // EXPO_PUBLIC_FIREBASE_DATABASE_URL to the URL the console shows.
  databaseURL: 'https://top-of-the-slops-default-rtdb.firebaseio.com',
  storageBucket: 'top-of-the-slops.firebasestorage.app',
  messagingSenderId: '927363870857',
  appId: '1:927363870857:web:ac48646d9299f557465658',
};

export interface FirebaseHandles {
  app: import('firebase/app').FirebaseApp;
  auth: import('firebase/auth').Auth;
  firestore: import('firebase/firestore').Firestore;
}

let cached: Promise<FirebaseHandles | null> | null = null;

/** Client config present (committed defaults make this always true). */
export function isFirebaseConfigured(): boolean {
  return Boolean(resolveConfig().apiKey && resolveConfig().projectId && resolveConfig().appId);
}

/**
 * The live-room switch: RTDB channel + Firestore chat + presence.
 * Flip to '1' once the conductor is deployed (docs/SETUP-TODO.md).
 */
export function isLiveBackend(): boolean {
  return process.env.EXPO_PUBLIC_LIVE_CHANNEL === '1';
}

function resolveConfig() {
  // `||` not `??` on purpose: an empty-string env var (a blank line in
  // .env) must fall back to the committed default, not blank out the
  // config and break Firebase init.
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || DEFAULT_CONFIG.apiKey,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || DEFAULT_CONFIG.databaseURL,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_CONFIG.storageBucket,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_CONFIG.messagingSenderId,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || DEFAULT_CONFIG.appId,
  };
}

export function getFirebase(): Promise<FirebaseHandles | null> {
  cached ??= init();
  return cached;
}

async function init(): Promise<FirebaseHandles | null> {
  const config = resolveConfig();
  if (!config.apiKey || !config.projectId || !config.appId) return null;

  try {
    const { initializeApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');
    const app = initializeApp(config);
    return { app, auth: getAuth(app), firestore: getFirestore(app) };
  } catch (err) {
    console.warn('[tots] Firebase init failed; running local-only', err);
    return null;
  }
}
