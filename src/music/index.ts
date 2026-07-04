import type { Track } from '../types';
import { AppleMusicProvider } from './AppleMusicProvider';
import type { MusicPlaylist, MusicProvider } from './MusicProvider';
import { PreviewMusicProvider } from './PreviewMusicProvider';

export type { MusicPlaylist, MusicProvider } from './MusicProvider';
export { DRIFT_TOLERANCE_MS } from './MusicProvider';
export { PreviewMusicProvider } from './PreviewMusicProvider';

export interface MusicMachine {
  provider: MusicProvider;
  preview: PreviewMusicProvider;
  /** True once a developer token is present (real MusicKit auth possible). */
  appleConfigured: boolean;
}

/** Is a real Apple developer token wired in this build? (JWTs start with
 * "eyJ" — guards against placeholder values left in .env.) */
export function isAppleConfigured(): boolean {
  const token = process.env.EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN;
  return Boolean(token && token.startsWith('eyJ'));
}

/**
 * The signed-in user's Apple Music library (empty until authorize() has
 * been granted, or when the provider has no user-library access).
 */
export async function fetchUserLibrary(limit = 24): Promise<Track[]> {
  const { provider } = getMusicMachine();
  if (!provider.getUserLibrary) return [];
  try {
    return await provider.getUserLibrary(limit);
  } catch (err) {
    console.warn('[tots] user library fetch failed', err);
    return [];
  }
}

/** Recently played tracks — falls back to the A–Z library when empty. */
export async function fetchRecentTracks(limit = 30): Promise<Track[]> {
  const { provider } = getMusicMachine();
  if (provider.getRecentTracks) {
    try {
      const recent = await provider.getRecentTracks(limit);
      if (recent.length > 0) return recent;
    } catch (err) {
      console.warn('[tots] recent tracks fetch failed', err);
    }
  }
  return fetchUserLibrary(limit);
}

export async function fetchUserPlaylists(limit = 50): Promise<MusicPlaylist[]> {
  const { provider } = getMusicMachine();
  if (!provider.getUserPlaylists) return [];
  try {
    return await provider.getUserPlaylists(limit);
  } catch (err) {
    console.warn('[tots] playlists fetch failed', err);
    return [];
  }
}

export async function fetchPlaylistTracks(playlistId: string, limit = 100): Promise<Track[]> {
  const { provider } = getMusicMachine();
  if (!provider.getPlaylistTracks) return [];
  try {
    return await provider.getPlaylistTracks(playlistId, limit);
  } catch (err) {
    console.warn('[tots] playlist tracks fetch failed', err);
    return [];
  }
}

/** Save a song to the user's Apple Music library. */
export async function addTrackToLibrary(trackId: string): Promise<boolean> {
  const { provider } = getMusicMachine();
  if (!provider.addToLibrary) return false;
  try {
    return await provider.addToLibrary(trackId);
  } catch (err) {
    console.warn('[tots] add to library failed', err);
    return false;
  }
}

/** Artist imagery for the ambient backdrop (null → fall back to album art). */
export async function fetchArtistArtwork(trackId: string): Promise<string | null> {
  const { provider } = getMusicMachine();
  if (!provider.getArtistArtwork) return null;
  try {
    return await provider.getArtistArtwork(trackId);
  } catch {
    return null;
  }
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
  machine =
    token && isAppleConfigured()
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
