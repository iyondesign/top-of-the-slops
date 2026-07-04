import { useCallback, useEffect, useState } from 'react';

import { loadOrCreateProfile, updateProfile } from '../identity/identity';
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

  return { profile, update };
}
