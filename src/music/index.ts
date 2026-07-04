import type { Track } from '../types';
import { AppleMusicProvider } from './AppleMusicProvider';
import type { MusicProvider } from './MusicProvider';
import { PreviewMusicProvider } from './PreviewMusicProvider';

export type { MusicProvider } from './MusicProvider';
export { DRIFT_TOLERANCE_MS } from './MusicProvider';
export { PreviewMusicProvider } from './PreviewMusicProvider';

export interface MusicMachine {
  provider: MusicProvider;
  preview: PreviewMusicProvider;
  /** True once a developer token is present (real MusicKit auth possible). */
  appleConfigured: boolean;
}

/** Is an Apple developer token wired in this build? */
export function isAppleConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN);
}

/**
 * ONE shared music machine for the whole app — the playback loop and the
 * "Connect Apple Music" flow must drive the same provider instance so
 * authorization state is shared.
 *
 * - With a developer token: the real AppleMusicProvider (MusicKit JS on
 *   web; native module on iOS once M0 lands) — authorize() prompts the
 *   Apple Music sign-in, subscribers hear full tracks.
 * - Otherwise: the preview provider (30s clips), which is also the
 *   permanent non-subscriber tier.
 */
let machine: MusicMachine | null = null;

export function getMusicMachine(): MusicMachine {
  if (machine) return machine;
  const preview = new PreviewMusicProvider();
  const token = process.env.EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN;
  machine = token
    ? { provider: new AppleMusicProvider(token), preview, appleConfigured: true }
    : { provider: preview, preview, appleConfigured: false };
  return machine;
}

/**
 * Catalog search for the pool contributor. Uses the real provider's
 * catalog when Apple is configured; otherwise the public iTunes Search
 * API so "add your favorites" works today with zero setup. Same Track
 * shape either way.
 */
export async function searchCatalog(query: string, limit = 12): Promise<Track[]> {
  const q = query.trim();
  if (!q) return [];

  if (isAppleConfigured()) {
    try {
      return await getMusicMachine().provider.search(q, limit);
    } catch {
      // fall through to the public search
    }
  }

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit}`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? [])
      .filter((r: any) => r.previewUrl && r.trackTimeMillis)
      .map((r: any) => ({
        id: String(r.trackId),
        title: r.trackName,
        artist: r.artistName,
        artworkUrl: String(r.artworkUrl100 ?? '').replace('100x100', '600x600'),
        previewUrl: r.previewUrl,
        // Stub rotates on the 30s preview boundary; the real conductor
        // schedules on full catalog duration once MusicKit is live.
        durationMs: 30_000,
        source: 'apple' as const,
      }));
  } catch {
    return [];
  }
}
