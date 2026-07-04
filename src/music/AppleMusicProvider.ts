import type { MusicTier, Track } from '../types';
import type { MusicProvider } from './MusicProvider';

/**
 * Native (iOS/iPadOS) placeholder. The real implementation is the M0
 * deliverable: a custom Expo Module (Swift, MusicKit framework) exposing
 * authorize/play/pause/seek + subscription status, resolved here by
 * platform extension. Until that bridge lands, native builds fall back to
 * PreviewMusicProvider via createMusicProvider().
 */
export class AppleMusicProvider implements MusicProvider {
  readonly name = 'apple-musickit-native';

  constructor(_developerToken: string) {}

  async authorize(): Promise<MusicTier> {
    throw new Error('Native MusicKit module not yet implemented (M0)');
  }

  async subscriptionStatus(): Promise<MusicTier> {
    return 'preview';
  }

  async getTrack(_trackId: string): Promise<Track | null> {
    return null;
  }

  async search(_query: string, _limit?: number): Promise<Track[]> {
    return [];
  }

  async getPreviewUrl(_trackId: string): Promise<string | null> {
    return null;
  }

  async play(_trackId: string, _positionMs: number): Promise<void> {
    throw new Error('Native MusicKit module not yet implemented (M0)');
  }

  async pause(): Promise<void> {}

  async seek(_positionMs: number): Promise<void> {}

  position(): number | null {
    return null;
  }

  destroy(): void {}
}
