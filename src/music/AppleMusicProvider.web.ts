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
  private loading: Promise<any> | null = null;

  constructor(private developerToken: string) {}

  private music(): Promise<any> {
    // Single in-flight bootstrap; reset on failure so a retry is possible.
    this.loading ??= this.bootstrap().catch((err) => {
      this.loading = null;
      throw err;
    });
    return this.loading;
  }

  private async bootstrap(): Promise<any> {
    if (typeof document === 'undefined') {
      throw new Error('MusicKit JS requires a browser environment');
    }

    // MusicKit v3 attaches `configure` AFTER its own async setup — the
    // script's onload fires too early, and the global can briefly exist
    // as a namespace without configure. The documented signal is the
    // `musickitloaded` event; we also poll as a belt-and-suspenders.
    const ready = () =>
      Boolean(window.MusicKit && typeof (window.MusicKit as any).configure === 'function');

    if (!ready()) {
      // Remove any corpse from a previous failed attempt so a retry
      // genuinely re-requests the script.
      document
        .querySelectorAll(`script[src="${MUSICKIT_JS_URL}"]`)
        .forEach((el) => el.remove());

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        const finish = () => {
          document.removeEventListener('musickitloaded', onLoaded);
          clearInterval(poll);
          clearTimeout(timer);
        };
        const onLoaded = () => {
          finish();
          resolve();
        };
        document.addEventListener('musickitloaded', onLoaded, { once: true });
        script.src = MUSICKIT_JS_URL;
        script.async = true;
        script.onerror = () => {
          finish();
          script.remove();
          reject(
            new Error(
              `MusicKit JS failed to load from ${MUSICKIT_JS_URL} — check the browser Network tab (content blocker / firewall?)`,
            ),
          );
        };
        document.head.appendChild(script);
        const poll = setInterval(() => {
          if (ready()) {
            finish();
            resolve();
          }
        }, 100);
        const timer = setTimeout(() => {
          finish();
          script.remove();
          reject(
            new Error(
              'MusicKit JS loaded but never became ready within 15s — try a hard refresh; if it persists, check the Console for CSP or blocker messages',
            ),
          );
        }, 15_000);
      });
    }

    this.instance = await (window.MusicKit as any).configure({
      developerToken: this.developerToken,
      app: { name: 'Top of the Slops', build: '0.12.0' },
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
    this.loading = null;
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
