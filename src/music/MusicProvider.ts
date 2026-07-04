import type { MusicTier, Track } from '../types';

/**
 * Every music-service call goes through this interface (plan §13.1) so a
 * second provider can slot in later. AppleMusicProvider (MusicKit) is the
 * only real implementation planned for MVP; PreviewMusicProvider covers
 * non-subscribers and development.
 */
export interface MusicProvider {
  readonly name: string;

  /** Request playback authorization. Resolves to the entitlement tier. */
  authorize(): Promise<MusicTier>;

  /** Current entitlement without prompting. */
  subscriptionStatus(): Promise<MusicTier>;

  getTrack(trackId: string): Promise<Track | null>;
  search(query: string, limit?: number): Promise<Track[]>;
  getPreviewUrl(trackId: string): Promise<string | null>;

  /** Load and play a track from a position (ms). */
  play(trackId: string, positionMs: number): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;

  /** Current playback position in ms, or null if idle. */
  position(): number | null;

  /** Tear down audio resources. */
  destroy(): void;
}

/**
 * Clients follow the conductor: seek to where the channel clock says we
 * should be, then drift-correct. Re-seek only past this threshold
 * (plan §13.2 — ±750ms is the audible-sync budget).
 */
export const DRIFT_TOLERANCE_MS = 750;
