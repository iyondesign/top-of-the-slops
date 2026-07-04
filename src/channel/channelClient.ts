import type { AppConfig, ChannelState, Track } from '../types';
import { StubChannel } from './stubChannel';

/**
 * The client's single door to channel data. M1 backs it with StubChannel;
 * M2 replaces these internals with RTDB subscriptions
 * (/channels/global/state, /app/config) + /.info/serverTimeOffset —
 * callers don't change.
 */

const stub = new StubChannel();
stub.start();

export function subscribeChannelState(listener: (state: ChannelState) => void): () => void {
  return stub.onState(listener);
}

export function subscribeAppConfig(listener: (config: AppConfig) => void): () => void {
  return stub.onConfig(listener);
}

export function subscribeTrackPool(listener: (tracks: Track[]) => void): () => void {
  return stub.onTracks(listener);
}

export function getTrackFromPool(trackId: string): Track | null {
  return stub.getTracks().find((t) => t.id === trackId) ?? null;
}

/**
 * serverNow(): with the stub, local time IS server time. In M2 this
 * becomes Date.now() + RTDB /.info/serverTimeOffset — the one shared
 * clock that makes ±750ms sync hold in the wild.
 */
export function serverNow(): number {
  return Date.now();
}

/** Dev-only: flip the off-air failsafe locally (long-press the LIVE pill). */
export function devSetAppConfig(partial: Partial<AppConfig>): void {
  stub.setConfig(partial);
}
