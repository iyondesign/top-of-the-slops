import type { MusicTier, Track } from '../types';
import type { MusicProvider } from './MusicProvider';

const MUSICKIT_JS_URL = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';

declare global {
  interface Window {
    MusicKit?: any;
  }
}

/**
 * MusicKit JS (v3) implementation for web. Requires an Apple Music
 * developer token (EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN). Subscribers get
 * full-catalog synced playback; without a token or subscription the app
 * falls back to PreviewMusicProvider (see createMusicProvider).
 *
 * The iOS/iPadOS counterpart is the M0 native module (Expo Modules API);
 * AppleMusicProvider.ts is its placeholder.
 */
export class AppleMusicProvider implements MusicProvider {
  readonly name = 'apple-musickit-js';

  private instance: any = null;

  constructor(private developerToken: string) {}

  private async music(): Promise<any> {
    if (this.instance) return this.instance;
    if (typeof document === 'undefined') {
      throw new Error('MusicKit JS requires a browser environment');
    }
    if (!window.MusicKit) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = MUSICKIT_JS_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MusicKit JS'));
        document.head.appendChild(script);
      });
    }
    this.instance = await window.MusicKit!.configure({
      developerToken: this.developerToken,
      app: { name: 'Top of the Slops', build: '0.1.0' },
    });
    return this.instance;
  }

  async authorize(): Promise<MusicTier> {
    const music = await this.music();
    await music.authorize();
    return this.subscriptionStatus();
  }

  async subscriptionStatus(): Promise<MusicTier> {
    try {
      const music = await this.music();
      return music.isAuthorized ? 'subscriber' : 'preview';
    } catch {
      return 'preview';
    }
  }

  async getTrack(trackId: string): Promise<Track | null> {
    const music = await this.music();
    const song = await music.api.music(`/v1/catalog/{{storefrontId}}/songs/${trackId}`);
    const data = song?.data?.data?.[0];
    if (!data) return null;
    return toTrack(data);
  }

  async search(query: string, limit = 10): Promise<Track[]> {
    const music = await this.music();
    const res = await music.api.music('/v1/catalog/{{storefrontId}}/search', {
      term: query,
      types: 'songs',
      limit,
    });
    const songs = res?.data?.results?.songs?.data ?? [];
    return songs.map(toTrack);
  }

  async getPreviewUrl(trackId: string): Promise<string | null> {
    const track = await this.getTrack(trackId);
    return track?.previewUrl ?? null;
  }

  /**
   * The user's library songs via the Music-User-Token that authorize()
   * granted. Library items carry library ids (i.xxx); we prefer the
   * catalog id from playParams so channel playback works everywhere.
   */
  async getUserLibrary(limit = 24): Promise<Track[]> {
    const music = await this.music();
    if (!music.isAuthorized) return [];
    const res = await music.api.music('/v1/me/library/songs', { limit });
    const items = res?.data?.data ?? [];
    return items.map((song: any) => {
      const attrs = song.attributes ?? {};
      return {
        id: String(attrs.playParams?.catalogId ?? song.id),
        title: attrs.name ?? 'Unknown',
        artist: attrs.artistName ?? 'Unknown',
        artworkUrl: attrs.artwork
          ? window.MusicKit!.formatArtworkURL(attrs.artwork, 600, 600)
          : '',
        previewUrl: attrs.previews?.[0]?.url ?? null,
        durationMs: attrs.durationInMillis ?? 0,
        source: 'apple' as const,
      };
    });
  }

  async play(trackId: string, positionMs: number): Promise<void> {
    const music = await this.music();
    await music.setQueue({ song: trackId });
    await music.play();
    if (positionMs > 0) await music.seekToTime(positionMs / 1000);
  }

  async pause(): Promise<void> {
    const music = await this.music();
    await music.pause();
  }

  async seek(positionMs: number): Promise<void> {
    const music = await this.music();
    await music.seekToTime(positionMs / 1000);
  }

  position(): number | null {
    if (!this.instance) return null;
    const seconds = this.instance.currentPlaybackTime;
    return typeof seconds === 'number' ? seconds * 1000 : null;
  }

  destroy(): void {
    this.instance?.stop?.();
    this.instance = null;
  }
}

function toTrack(song: any): Track {
  const attrs = song.attributes ?? {};
  return {
    id: song.id,
    title: attrs.name ?? 'Unknown',
    artist: attrs.artistName ?? 'Unknown',
    artworkUrl: attrs.artwork
      ? window.MusicKit!.formatArtworkURL(attrs.artwork, 600, 600)
      : '',
    previewUrl: attrs.previews?.[0]?.url ?? null,
    durationMs: attrs.durationInMillis ?? 0,
    source: 'apple',
  };
}
