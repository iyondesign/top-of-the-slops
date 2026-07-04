import { useCallback, useEffect, useRef, useState } from 'react';

import { serverNow, subscribeTrackPool } from '../channel/channelClient';
import { DRIFT_TOLERANCE_MS, getMusicMachine } from '../music';
import type { AppConfig, ChannelState } from '../types';

/**
 * The client follower loop (plan §13.2): on ChannelState change, seek to
 * serverNow() - startedAtServerMs and play; drift-correct past ±750ms.
 *
 * Resilient audio: the primary provider (MusicKit full tracks when a
 * token + subscription are present) is attempted first; if it throws OR
 * makes no audible progress for ~6s, we fall back to the preview
 * provider (30s clips looped on the channel clock) so the room is never
 * silent. Each new track retries the primary first.
 */
export function usePlayback(state: ChannelState | null, config: AppConfig) {
  const [enabled, setEnabled] = useState(false);
  const machine = useRef(getMusicMachine());
  const stateRef = useRef(state);
  stateRef.current = state;
  const fellBack = useRef(false);
  const stall = useRef({ lastPos: -2, count: 0 });

  // Keep the preview provider's track table in sync with the pool.
  useEffect(
    () => subscribeTrackPool((tracks) => machine.current.preview.registerTracks(tracks)),
    [],
  );

  const syncTo = useCallback(async () => {
    const s = stateRef.current;
    if (!s) return;
    const { provider, preview } = machine.current;
    const positionMs = Math.max(0, serverNow() - s.startedAtServerMs);
    stall.current = { lastPos: -2, count: 0 };

    if (!fellBack.current && provider !== preview) {
      try {
        await provider.play(s.currentTrackId, positionMs);
        return;
      } catch (err) {
        console.warn('[tots] primary playback failed — falling back to preview audio', err);
        fellBack.current = true;
      }
    }
    try {
      await preview.play(s.currentTrackId, Math.max(0, serverNow() - s.startedAtServerMs));
    } catch (err) {
      console.warn('[tots] preview playback failed too', err);
    }
  }, []);

  useEffect(() => {
    const { provider, preview } = machine.current;
    if (!enabled || !state || !config.isLive || !state.isPlaying) {
      void provider.pause();
      void preview.pause();
      return;
    }

    // New track: give the primary provider another chance.
    fellBack.current = false;
    let disposed = false;
    void syncTo();

    const driftTimer = setInterval(() => {
      if (disposed) return;
      const s = stateRef.current;
      if (!s) return;
      const active = fellBack.current ? preview : provider;
      const expected = serverNow() - s.startedAtServerMs;
      const actual = active.position();

      // Stall watchdog on the primary: no position movement across two
      // ticks (~6s) means MusicKit is wedged — switch to previews.
      if (!fellBack.current && provider !== preview) {
        const pos = actual ?? -1;
        if (pos === stall.current.lastPos) {
          stall.current.count += 1;
        } else {
          stall.current.count = 0;
        }
        stall.current.lastPos = pos;
        if (stall.current.count >= 2) {
          console.warn('[tots] playback made no progress — switching to preview audio');
          fellBack.current = true;
          void syncTo();
          return;
        }
      }

      if (actual !== null && Math.abs(actual - expected) > DRIFT_TOLERANCE_MS) {
        void active.seek(expected);
      }
    }, 3_000);

    return () => {
      disposed = true;
      clearInterval(driftTimer);
    };
  }, [enabled, config.isLive, state?.currentTrackId, state?.startedAtServerMs, state?.isPlaying]);

  // The provider is a shared singleton (also driven by the connect flow),
  // so playback does not destroy it on unmount.

  const enable = useCallback(() => {
    setEnabled(true);
    // Kick playback inside the click's user-activation window — some
    // browsers only allow audio start tied to a gesture.
    void syncTo();
  }, [syncTo]);

  // Mute is LOCAL: the broadcast never pauses (the room stays in sync);
  // you silence your own radio. The clock keeps running.
  const [muted, setMuted] = useState(false);
  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      machine.current.provider.setMuted?.(next);
      machine.current.preview.setMuted?.(next);
      return next;
    });
  }, []);

  return { enabled, enable, muted, toggleMute };
}
