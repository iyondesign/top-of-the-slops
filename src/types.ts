/**
 * Core domain types. Shapes mirror the M2 data model (plan §14 / fable spec)
 * so the stub channel can be swapped for the RTDB-backed conductor without
 * touching the UI.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  previewUrl: string | null;
  durationMs: number;
  source: 'apple' | 'ai-ugc';
}

/** Mirrors /channels/global/state in RTDB (written only by the conductor). */
export interface ChannelState {
  currentTrackId: string;
  startedAtServerMs: number;
  durationMs: number;
  isPlaying: boolean;
  version: number;
  nextAdvanceAtMs: number;
  listenerCount: number;
  liveFireCount: number;
  liveSlopCount: number;
}

/** One play of one track on the channel — the unit votes attach to. */
export function trackPlayId(state: Pick<ChannelState, 'currentTrackId' | 'startedAtServerMs'>): string {
  return `${state.currentTrackId}@${state.startedAtServerMs}`;
}

export type VoteValue = 'fire' | 'slop';

export interface ChatMessage {
  id: string;
  userId: string;
  handle: string;
  avatar: string;
  text: string;
  createdAtMs: number;
}

export interface TrackBoardEntry {
  track: Track;
  fire: number;
  slop: number;
  net: number;
  playedAtMs: number;
  booedOff: boolean;
}

export interface TastemakerEntry {
  userId: string;
  handle: string;
  avatar: string;
  score: number;
}

export interface Leaderboards {
  tracks: TrackBoardEntry[];
  tastemakers: TastemakerEntry[];
}

/** Mirrors /app/config — global kill switches (plan §13.4). */
export interface AppConfig {
  isLive: boolean;
  chatEnabled: boolean;
}

export type MusicTier = 'subscriber' | 'preview';

export interface UserProfile {
  uid: string;
  handle: string;
  avatar: string;
  isAnonymous: boolean;
  createdAt: number;
}
