import type { AppConfig, ChannelState, Leaderboards, Track, VoteValue } from '../types';
import { isFirebaseConfigured } from '../firebase';
import { FirebaseChannelTransport } from './firebaseChannel';
import { stubChannel } from './stubChannel';
import type { ChannelTransport } from './transport';

/**
 * The client's single door to channel data. With Firebase configured
 * (EXPO_PUBLIC_FIREBASE_*), this is the live M2 transport — RTDB channel
 * state written by the Cloud Run conductor, real presence, Firestore
 * votes. Without it, the stub conductor keeps the app fully functional
 * offline. Same contract either way.
 */

const stubTransport: ChannelTransport = {
  subscribeState: (l) => stubChannel.onState(l),
  subscribeConfig: (l) => stubChannel.onConfig(l),
  subscribeTracks: (l) => stubChannel.onTracks(l),
  subscribeLeaderboards: (l) => stubChannel.onLeaderboards(l),
  subscribeBooedOff: (l) => stubChannel.onBooedOff(l),
  getTrack: (id) => stubChannel.getTracks().find((t) => t.id === id) ?? null,
  serverNow: () => Date.now(),
  attachPresence: () => {},
  castVote: async (userId, handle, avatar, value) =>
    stubChannel.castVote(userId, handle, avatar, value),
  getUserVote: (userId) => stubChannel.getUserVote(userId),
};

let transport: ChannelTransport;
if (isFirebaseConfigured()) {
  transport = new FirebaseChannelTransport();
} else {
  transport = stubTransport;
  stubChannel.start();
}

export function subscribeChannelState(listener: (state: ChannelState) => void): () => void {
  return transport.subscribeState(listener);
}

export function subscribeAppConfig(listener: (config: AppConfig) => void): () => void {
  return transport.subscribeConfig(listener);
}

export function subscribeTrackPool(listener: (tracks: Track[]) => void): () => void {
  return transport.subscribeTracks(listener);
}

export function subscribeLeaderboards(listener: (boards: Leaderboards) => void): () => void {
  return transport.subscribeLeaderboards(listener);
}

export function subscribeBooedOff(listener: (track: Track) => void): () => void {
  return transport.subscribeBooedOff(listener);
}

export function getTrackFromPool(trackId: string): Track | null {
  return transport.getTrack(trackId);
}

/**
 * Contribute a favorite to the shared candidate pool. Local (stub) for
 * now; M2 routes this to /channels/global/meta.poolTrackIds behind admin
 * guardrails. Returns false if already in the pool.
 */
export function addToPool(track: Track): boolean {
  return stubChannel.addToPool(track);
}

/** The one shared clock (RTDB /.info/serverTimeOffset in M2). */
export function serverNow(): number {
  return transport.serverNow();
}

export function attachPresence(uid: string): void {
  transport.attachPresence(uid);
}

export async function castVote(
  userId: string,
  handle: string,
  avatar: string,
  value: VoteValue,
  currentState: ChannelState,
): Promise<boolean> {
  return transport.castVote(userId, handle, avatar, value, currentState);
}

export function getUserVote(userId: string): VoteValue | null {
  return transport.getUserVote(userId);
}

/** Dev-only: flip the off-air failsafe locally (long-press the LIVE pill). */
export function devSetAppConfig(partial: Partial<AppConfig>): void {
  stubChannel.setConfig(partial);
}
