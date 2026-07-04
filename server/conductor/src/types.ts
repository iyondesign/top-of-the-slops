/** Server-side mirrors of the RTDB data model (fable spec, M2). */

export interface Track {
  title: string;
  artist: string;
  artworkUrl: string;
  previewUrl: string | null;
  durationMs: number;
  source: 'apple' | 'ai-ugc';
}

export interface ChannelMeta {
  title: string;
  poolTrackIds: string[];
  cooldownMs: number;
  advanceGraceMs: number;
}

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

export interface AppConfig {
  isLive: boolean;
  chatEnabled: boolean;
}
