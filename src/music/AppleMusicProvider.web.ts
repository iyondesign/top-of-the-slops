import type { MusicTier, Track } from '../types';
import type { MusicPlaylist, MusicProvider } from './MusicProvider';

/**
 * Map catalog songs AND library-songs to our Track shape. Catalog items
 * (type "songs") carry the catalog id directly; library items (i.xxx)
 * prefer playParams.catalogId so channel playback works for everyone.
 * Items with no resolvable id (rare local uploads) are dropped.
 */
function mapSongs(items: any[] | undefined): Track[] {
  return (items ?? [])
    .map((song: any) => {
      const attrs = song.attributes ?? {};
      const id =
        song.type === 'songs'
          ? String(song.id)
          : String(attrs.playParams?.catalogId ?? song.id ?? '');
      return {
        id,
        title: attrs.name ?? 'Unknown',
        artist: attrs.artistName ?? 'Unknown',
        artworkUrl: attrs.artwork
          ? window.MusicKit!.formatArtworkURL(attrs.artwork, 600, 600)
          : '',
        previewUrl: attrs.previews?.[0]?.url ?? null,
        durationMs: attrs.durationInMillis ?? 0,
        source: 'apple' as const,
      };
    })
    .filter((t: Track) => t.id && t.id !== 'undefined');
}

/**
 * MusicKit sources, tried in order. The same-origin fallback sidesteps
 * content blockers / corporate proxies that neuter Apple's CDN URL —
 * populate it once with:
 *   curl -o public/musickit.js https://js-cdn.music.apple.com/musickit/v3/musickit.js
 */
const MUSICKIT_SOURCES = [
  'https://js-cdn.music.apple.com/musickit/v3/musickit.js',
  '/musickit.js',
];

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
/** Wait until the MusicKit global is genuinely ready (event + poll). */
function waitForMusicKitReady(ready: () => boolean, timeoutMs: number, label: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (ready()) return resolve();
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
    const poll = setInterval(() => {
      if (ready()) {
        finish();
        resolve();
      }
    }, 100);
    const timer = setTimeout(() => {
      finish();
      reject(new Error(`${label}: loaded but MusicKit never became ready`));
    }, timeoutMs);
  });
}

/**
 * Preferred path: fetch the same-origin copy and execute it with every
 * Node-ish global SHADOWED to undefined. MusicKit v3's environment sniff
 * uses bare identifiers (process.versions.node, Buffer, module…) that
 * collide with Metro's partial web polyfills — shadowing them forces its
 * browser code path deterministically instead of shimming Node globals
 * one whack-a-mole at a time.
 */
async function loadViaScopedEval(src: string, ready: () => boolean): Promise<void> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${src}: HTTP ${res.status} (run the curl in public/README-musickit.md)`);
  const code = await res.text();
  // eslint-disable-next-line no-new-func
  new Function(
    'process',
    'Buffer',
    'module',
    'exports',
    'require',
    'global',
    code + '\n//# sourceURL=' + src,
  )(undefined, undefined, undefined, undefined, undefined, window);
  await waitForMusicKitReady(ready, 8_000, src);
}

/** Legacy fallback: plain script tag (environments without the Metro clash). */
function loadViaScriptTag(src: string, ready: () => boolean): Promise<void> {
  document.querySelectorAll(`script[data-musickit]`).forEach((el) => el.remove());
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute('data-musickit', '1');
    script.onerror = () => {
      script.remove();
      reject(new Error(`${src}: request failed (blocked or offline)`));
    };
    document.head.appendChild(script);
    waitForMusicKitReady(ready, 12_000, src).then(resolve, (err) => {
      script.remove();
      reject(err);
    });
  });
}

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

    // Metro's web runtime defines a bare `process` global without
    // `.versions`; MusicKit v3's environment sniff does
    // `process.versions.node` and crashes mid-boot ("Cannot read
    // properties of undefined (reading 'node')"). Give it the shape it
    // expects before the script runs.
    const proc = (window as any).process;
    if (proc && typeof proc === 'object' && !proc.versions) {
      proc.versions = {};
    }

    // MusicKit v3 attaches `configure` AFTER its own async setup — the
    // script's onload fires too early, and the global can briefly exist
    // as a namespace without configure. The documented signal is the
    // `musickitloaded` event; we also poll as a belt-and-suspenders.
    const ready = () =>
      Boolean(window.MusicKit && typeof (window.MusicKit as any).configure === 'function');

    if (!ready()) {
      const failures: string[] = [];

      // 1) Same-origin copy, executed with Node globals shadowed — the
      //    reliable path under Metro web.
      try {
        await loadViaScopedEval('/musickit.js', ready);
        console.log('[tots] MusicKit ready via /musickit.js (scoped eval)');
      } catch (err: any) {
        failures.push(err?.message ?? String(err));
      }

      // 2) CDN script tag fallback for environments without the clash.
      if (!ready()) {
        for (const src of MUSICKIT_SOURCES) {
          if (src === '/musickit.js') continue;
          try {
            await loadViaScriptTag(src, ready);
            console.log(`[tots] MusicKit ready via ${src}`);
            break;
          } catch (err: any) {
            failures.push(err?.message ?? String(err));
          }
        }
      }

      if (!ready()) {
        throw new Error(
          `MusicKit could not initialize from any source.\n- ${failures.join('\n- ')}\n` +
            'Self-host fix: curl -o public/musickit.js https://js-cdn.music.apple.com/musickit/v3/musickit.js && restart',
        );
      }
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
   * granted (alphabetical — the browse fallback).
   */
  async getUserLibrary(limit = 24): Promise<Track[]> {
    const music = await this.music();
    if (!music.isAuthorized) return [];
    const res = await music.api.music('/v1/me/library/songs', { limit });
    return mapSongs(res?.data?.data);
  }

  /** Recently played tracks — the natural default when picking music. */
  async getRecentTracks(limit = 30): Promise<Track[]> {
    const music = await this.music();
    if (!music.isAuthorized) return [];
    const res = await music.api.music('/v1/me/recent/played/tracks', {
      limit: Math.min(limit, 30),
      types: 'songs,library-songs',
    });
    return mapSongs(res?.data?.data);
  }

  /** The user's library playlists. */
  async getUserPlaylists(limit = 50): Promise<MusicPlaylist[]> {
    const music = await this.music();
    if (!music.isAuthorized) return [];
    const res = await music.api.music('/v1/me/library/playlists', { limit });
    const items = res?.data?.data ?? [];
    return items.map((p: any) => ({
      id: String(p.id),
      name: p.attributes?.name ?? 'Untitled playlist',
      artworkUrl: p.attributes?.artwork
        ? window.MusicKit!.formatArtworkURL(p.attributes.artwork, 300, 300)
        : '',
    }));
  }

  /** Tracks inside one library playlist. */
  async getPlaylistTracks(playlistId: string, limit = 100): Promise<Track[]> {
    const music = await this.music();
    if (!music.isAuthorized) return [];
    const res = await music.api.music(`/v1/me/library/playlists/${playlistId}/tracks`, {
      limit: Math.min(limit, 100),
    });
    return mapSongs(res?.data?.data);
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
