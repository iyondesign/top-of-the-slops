import { useEffect, useRef, useState } from 'react';

import { serverNow, subscribeTrackPool } from '../channel/channelClient';
import { DRIFT_TOLERANCE_MS, getMusicMachine } from '../music';
import type { AppConfig, ChannelState } from '../types';

/**
 * The client follower loop (plan §13.2, M0 pattern): on ChannelState
 * change, seek to serverNow() - startedAtServerMs and play; every few
 * seconds, drift-correct if we're off by more than ±750ms.
 *
 * Playback needs a user gesture on web, so it's armed by `enable()`
 * ("Tap to tune in") rather than autoplaying.
 */
export function usePlayback(state: ChannelState | null, config: AppConfig) {
  const [enabled, setEnabled] = useState(false);
  const machine = useRef(getMusicMachine());

  // Keep the preview provider's track table in sync with the pool.
  useEffect(
    () => subscribeTrackPool((tracks) => machine.current.preview.registerTracks(tracks)),
    [],
  );

  useEffect(() => {
    const { provider } = machine.current;
    if (!enabled || !state || !config.isLive || !state.isPlaying) {
      void provider.pause();
      return;
    }

    let disposed = false;
    const syncTo = async () => {
      const positionMs = Math.max(0, serverNow() - state.startedAtServerMs);
      await provider.play(state.currentTrackId, positionMs);
    };
    void syncTo().catch((err) => console.warn('[tots] playback failed', err));

    const driftTimer = setInterval(() => {
      if (disposed) return;
      const expected = serverNow() - state.startedAtServerMs;
      const actual = provider.position();
      if (actual !== null && Math.abs(actual - expected) > DRIFT_TOLERANCE_MS) {
        void provider.seek(expected);
      }
    }, 3_000);

    return () => {
      disposed = true;
      clearInterval(driftTimer);
    };
  }, [enabled, config.isLive, state?.currentTrackId, state?.startedAtServerMs, state?.isPlaying]);

  // The provider is a shared singleton (also driven by the connect flow),
  // so playback does not destroy it on unmount.

  return { enabled, enable: () => setEnabled(true) };
}
