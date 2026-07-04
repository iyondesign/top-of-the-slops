/**
 * Firebase bootstrap. All EXPO_PUBLIC_FIREBASE_* vars must be set for the
 * backend to activate; otherwise the app runs fully local (stub channel +
 * local anonymous identity) — no dead screens while infra is stood up.
 *
 * Backend plan (fable spec, shared setup): RTDB for channel state +
 * presence, Firestore for users (later votes/leaderboards), Anonymous
 * Auth, conductor on Cloud Run, watchdog on Cloud Scheduler.
 */

export interface FirebaseHandles {
  app: import('firebase/app').FirebaseApp;
  auth: import('firebase/auth').Auth;
  firestore: import('firebase/firestore').Firestore;
}

let cached: Promise<FirebaseHandles | null> | null = null;

export function getFirebase(): Promise<FirebaseHandles | null> {
  cached ??= init();
  return cached;
}

async function init(): Promise<FirebaseHandles | null> {
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
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
