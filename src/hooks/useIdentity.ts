import { useCallback, useEffect, useState } from 'react';

import {
  linkWithApple,
  linkWithEmail,
  linkWithGoogle,
  type AuthProviderId,
  type LinkResult,
} from '../identity/authProviders';
import { loadOrCreateProfile, persistLinkedProfile, updateProfile } from '../identity/identity';
import type { UserProfile } from '../types';

export function useIdentity() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadOrCreateProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => console.warn('[tots] identity bootstrap failed', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    async (updates: Partial<Pick<UserProfile, 'handle' | 'avatar'>>) => {
      if (!profile) return;
      const next = await updateProfile(profile, updates);
      setProfile(next);
    },
    [profile],
  );

  /**
   * Keep your cred: attach a real identity (iCloud / Google / email) to
   * the anonymous session. On success the profile stops being anonymous;
   * if the identity owned an existing account, the uid follows it.
   */
  const link = useCallback(
    async (
      provider: AuthProviderId,
      creds?: { email: string; password: string },
    ): Promise<LinkResult> => {
      if (!profile) return { ok: false, reason: 'no-session' };
      const result =
        provider === 'apple'
          ? await linkWithApple()
          : provider === 'google'
            ? await linkWithGoogle()
            : await linkWithEmail(creds?.email ?? '', creds?.password ?? '');
      if (result.ok) {
        const next: UserProfile = {
          ...profile,
          uid: result.uid ?? profile.uid,
          isAnonymous: false,
        };
        await persistLinkedProfile(next);
        setProfile(next);
      }
      return result;
    },
    [profile],
  );

  return { profile, update, link };
}
