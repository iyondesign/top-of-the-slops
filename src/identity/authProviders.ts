import { Platform } from 'react-native';

import { getFirebase, isFirebaseConfigured } from '../firebase';

/**
 * Progressive auth on Firebase Auth (plan §13.3): the user starts
 * anonymous, then keeps their cred by attaching a real identity —
 * Sign in with Apple (iCloud), Google, or a direct email/password
 * account. We LINK the credential onto the existing anonymous uid
 * (linkWith*) so votes, handle, and tastemaker score survive the
 * upgrade; if the identity already belongs to another account
 * (credential-already-in-use), we sign into that account instead and
 * the local profile follows the new uid.
 *
 * Web-first (popup flows). Native uses the same functions once the M0
 * dev build adds the platform auth session (expo-auth-session /
 * AppleAuthentication) — until then native returns 'native-pending'.
 */

export type AuthProviderId = 'apple' | 'google' | 'password';

export interface LinkResult {
  ok: boolean;
  /** New uid if the link resolved to a different existing account. */
  uid?: string;
  reason?:
    | 'not-configured'
    | 'native-pending'
    | 'no-session'
    | 'cancelled'
    | 'wrong-password'
    | 'weak-password'
    | 'invalid-email'
    | 'error';
}

function guard(): LinkResult | null {
  if (!isFirebaseConfigured()) return { ok: false, reason: 'not-configured' };
  if (Platform.OS !== 'web') return { ok: false, reason: 'native-pending' };
  return null;
}

export async function linkWithApple(): Promise<LinkResult> {
  const blocked = guard();
  if (blocked) return blocked;
  const firebase = await getFirebase();
  if (!firebase?.auth.currentUser) return { ok: false, reason: 'no-session' };

  const { OAuthProvider, linkWithPopup, signInWithPopup } = await import('firebase/auth');
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  return popupLink(
    () => linkWithPopup(firebase.auth.currentUser!, provider),
    () => signInWithPopup(firebase.auth, provider),
    'apple',
  );
}

export async function linkWithGoogle(): Promise<LinkResult> {
  const blocked = guard();
  if (blocked) return blocked;
  const firebase = await getFirebase();
  if (!firebase?.auth.currentUser) return { ok: false, reason: 'no-session' };

  const { GoogleAuthProvider, linkWithPopup, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  return popupLink(
    () => linkWithPopup(firebase.auth.currentUser!, provider),
    () => signInWithPopup(firebase.auth, provider),
    'google',
  );
}

export async function linkWithEmail(email: string, password: string): Promise<LinkResult> {
  if (!isFirebaseConfigured()) return { ok: false, reason: 'not-configured' };
  const firebase = await getFirebase();
  if (!firebase?.auth.currentUser) return { ok: false, reason: 'no-session' };

  const { EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword } = await import(
    'firebase/auth'
  );
  try {
    const result = await linkWithCredential(
      firebase.auth.currentUser,
      EmailAuthProvider.credential(email.trim(), password),
    );
    await recordLink(result.user.uid, 'password');
    return { ok: true, uid: result.user.uid };
  } catch (err: any) {
    const code: string = err?.code ?? '';
    if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') {
      // Existing direct account: sign into it instead.
      try {
        const result = await signInWithEmailAndPassword(firebase.auth, email.trim(), password);
        await recordLink(result.user.uid, 'password');
        return { ok: true, uid: result.user.uid };
      } catch (signInErr: any) {
        return { ok: false, reason: mapCode(signInErr?.code) };
      }
    }
    return { ok: false, reason: mapCode(code) };
  }
}

async function popupLink(
  link: () => Promise<{ user: { uid: string } }>,
  signIn: () => Promise<{ user: { uid: string } }>,
  provider: AuthProviderId,
): Promise<LinkResult> {
  try {
    const result = await link();
    await recordLink(result.user.uid, provider);
    return { ok: true, uid: result.user.uid };
  } catch (err: any) {
    const code: string = err?.code ?? '';
    if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
      // Identity already owns an account — adopt it.
      try {
        const result = await signIn();
        await recordLink(result.user.uid, provider);
        return { ok: true, uid: result.user.uid };
      } catch (signInErr: any) {
        return { ok: false, reason: mapCode(signInErr?.code) };
      }
    }
    return { ok: false, reason: mapCode(code) };
  }
}

/** Mirror the upgrade to Firestore /users/{uid}. */
async function recordLink(uid: string, provider: AuthProviderId): Promise<void> {
  const firebase = await getFirebase();
  if (!firebase) return;
  try {
    const { arrayUnion, doc, setDoc } = await import('firebase/firestore');
    await setDoc(
      doc(firebase.firestore, 'users', uid),
      { isAnonymous: false, providers: arrayUnion(provider) },
      { merge: true },
    );
  } catch (err) {
    console.warn('[tots] failed to record auth link', err);
  }
}

function mapCode(code?: string): LinkResult['reason'] {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'cancelled';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'wrong-password';
    case 'auth/weak-password':
      return 'weak-password';
    case 'auth/invalid-email':
      return 'invalid-email';
    default:
      return 'error';
  }
}
