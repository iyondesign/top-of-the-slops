import { useCallback, useEffect, useState } from 'react';

import { getMusicMachine, isAppleConfigured } from '../music';
import type { MusicTier } from '../types';

/**
 * Entitlement state for the "Connect Apple Music" flow (plan §13.3:
 * MusicKit authorization → subscriber vs preview tier).
 *
 * - `unconfigured`: no developer token in this build — the connect button
 *   explains what's needed rather than failing. (This is where we are
 *   until a token is dropped into EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN.)
 * - `preview`: not signed in / not a subscriber — 30s previews.
 * - `subscriber`: Apple Music authorized — full synced tracks.
 */
export type MusicStatus = 'unconfigured' | 'preview' | 'subscriber';

export function useMusicAuth() {
  const [status, setStatus] = useState<MusicStatus>(
    isAppleConfigured() ? 'preview' : 'unconfigured',
  );
  const [connecting, setConnecting] = useState(false);

  // Reflect any entitlement already granted this session.
  useEffect(() => {
    if (!isAppleConfigured()) return;
    let cancelled = false;
    void getMusicMachine()
      .provider.subscriptionStatus()
      .then((tier: MusicTier) => {
        if (!cancelled) setStatus(tier === 'subscriber' ? 'subscriber' : 'preview');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /** Prompt the Apple Music sign-in (MusicKit authorize). */
  const connect = useCallback(async () => {
    if (!isAppleConfigured()) return;
    setConnecting(true);
    try {
      const tier = await getMusicMachine().provider.authorize();
      setStatus(tier === 'subscriber' ? 'subscriber' : 'preview');
    } catch (err) {
      console.warn('[tots] Apple Music authorize failed', err);
    } finally {
      setConnecting(false);
    }
  }, []);

  return { status, connecting, connect, configured: isAppleConfigured() };
}
