import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserProfile } from '../types';
import { getFirebase } from '../firebase';
import { randomAvatar, randomHandle } from './handles';

/**
 * Anonymous-first identity (plan §7, fable spec M1):
 * - With Firebase configured: signInAnonymously -> uid, and the profile is
 *   mirrored to Firestore /users/{uid}. Built so Sign in with Apple (M4)
 *   can later linkWithCredential onto the SAME uid.
 * - Without Firebase (local dev): a locally persisted uid so the app is
 *   never blocked on backend setup. Same shape, same storage key.
 */

const STORAGE_KEY = 'tots.profile.v1';

export async function loadOrCreateProfile(): Promise<UserProfile> {
  const stored = await readStoredProfile();
  const firebase = await getFirebase();

  if (firebase) {
    // Real Firebase Anonymous Auth — but NEVER let backend state (e.g.
    // the Anonymous provider not yet enabled in the console, or a
    // network block) dead-screen the app: fall back to a local profile.
    try {
      return await loadFirebaseProfile(firebase, stored);
    } catch (err) {
      console.warn('[tots] Firebase identity unavailable, using local profile', err);
    }
  }

  if (stored) return stored;
  const profile: UserProfile = {
    uid: `local-${Math.random().toString(36).slice(2, 10)}`,
    handle: randomHandle(),
    avatar: randomAvatar(),
    isAnonymous: true,
    createdAt: Date.now(),
  };
  await persistLocal(profile);
  return profile;
}

async function loadFirebaseProfile(
  firebase: NonNullable<Awaited<ReturnType<typeof getFirebase>>>,
  stored: UserProfile | null,
): Promise<UserProfile> {
  const { signInAnonymously } = await import('firebase/auth');
  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');

  const cred = await signInAnonymously(firebase.auth);
  const uid = cred.user.uid;
  const userRef = doc(firebase.firestore, 'users', uid);

  // Firestore may not be provisioned yet — the auth uid alone is still a
  // win (stable identity); profile data stays local until it is.
  let snapshot: Awaited<ReturnType<typeof getDoc>> | null = null;
  try {
    snapshot = await getDoc(userRef);
  } catch (err) {
    console.warn('[tots] Firestore unavailable; keeping profile local', err);
    const profile: UserProfile = {
      uid,
      handle: stored?.handle ?? randomHandle(),
      avatar: stored?.avatar ?? randomAvatar(),
      isAnonymous: true,
      createdAt: stored?.createdAt ?? Date.now(),
    };
    await persistLocal(profile);
    return profile;
  }

  if (snapshot.exists()) {
    const data = snapshot.data() as any;
    const profile: UserProfile = {
      uid,
      handle: data.handle,
      avatar: data.avatar,
      isAnonymous: data.isAnonymous ?? true,
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    };
    await persistLocal(profile);
    return profile;
  }

  const profile: UserProfile = {
    uid,
    // Reuse a pre-Firebase local handle if one existed, so identity feels
    // continuous the day the backend turns on.
    handle: stored?.handle ?? randomHandle(),
    avatar: stored?.avatar ?? randomAvatar(),
    isAnonymous: true,
    createdAt: Date.now(),
  };
  await setDoc(userRef, {
    handle: profile.handle,
    avatar: profile.avatar,
    isAnonymous: true,
    createdAt: serverTimestamp(),
  });
  await persistLocal(profile);
  return profile;
}

export async function updateProfile(
  profile: UserProfile,
  updates: Partial<Pick<UserProfile, 'handle' | 'avatar'>>,
): Promise<UserProfile> {
  const next = { ...profile, ...updates };
  await persistLocal(next);

  const firebase = await getFirebase();
  if (firebase && !profile.uid.startsWith('local-')) {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(
      doc(firebase.firestore, 'users', profile.uid),
      { handle: next.handle, avatar: next.avatar },
      { merge: true },
    );
  }
  return next;
}

/** Persist the post-link profile (no longer anonymous; uid may change). */
export async function persistLinkedProfile(profile: UserProfile): Promise<void> {
  await persistLocal(profile);
}

async function readStoredProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

async function persistLocal(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Non-fatal: identity just won't survive reload.
  }
}
