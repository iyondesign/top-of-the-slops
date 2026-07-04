import type { AppConfig, ChannelState, Leaderboards, Track, VoteValue } from '../types';

/**
 * Everything the UI needs from "the channel", regardless of backend.
 * Two implementations: the stub conductor (local dev / M1) and the
 * Firebase transport (RTDB + Firestore, M2+), selected in channelClient.
 */
export interface ChannelTransport {
  subscribeState(listener: (state: ChannelState) => void): () => void;
  subscribeConfig(listener: (config: AppConfig) => void): () => void;
  subscribeTracks(listener: (tracks: Track[]) => void): () => void;
  subscribeLeaderboards(listener: (boards: Leaderboards) => void): () => void;
  subscribeBooedOff(listener: (track: Track) => void): () => void;

  getTrack(trackId: string): Track | null;

  /** Shared channel clock (RTDB serverTimeOffset in M2; local in stub). */
  serverNow(): number;

  /** Register this client in /presence (no-op in stub). */
  attachPresence(uid: string): void;

  castVote(
    userId: string,
    handle: string,
    avatar: string,
    value: VoteValue,
    currentState: ChannelState,
  ): Promise<boolean>;
  getUserVote(userId: string): VoteValue | null;
}
