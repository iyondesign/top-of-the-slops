import { AppleMusicProvider } from './AppleMusicProvider';
import type { MusicProvider } from './MusicProvider';
import { PreviewMusicProvider } from './PreviewMusicProvider';

export type { MusicProvider } from './MusicProvider';
export { DRIFT_TOLERANCE_MS } from './MusicProvider';
export { PreviewMusicProvider } from './PreviewMusicProvider';

/**
 * Provider selection:
 * - With an Apple developer token, use MusicKit (JS on web, native module
 *   on iOS once M0 lands) — subscribers hear full tracks.
 * - Otherwise, the preview provider: 30s clips looped against the channel
 *   clock. This is also the permanent non-subscriber tier.
 */
export function createMusicProvider(): { provider: MusicProvider; preview: PreviewMusicProvider } {
  const preview = new PreviewMusicProvider();
  const token = process.env.EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN;
  if (token) {
    return { provider: new AppleMusicProvider(token), preview };
  }
  return { provider: preview, preview };
}
