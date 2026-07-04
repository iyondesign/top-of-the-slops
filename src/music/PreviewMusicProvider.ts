import type { MusicTier, Track } from '../types';
import type { MusicProvider } from './MusicProvider';

/**
 * Preview-tier provider: plays each track's 30s preview clip. This is the
 * experience for non-subscribers (plan §5) and doubles as the M1 stub
 * provider while the native MusicKit bridge (M0) and MusicKit JS wiring
 * mature. On web it drives an HTMLAudioElement; on native it simulates a
 * silent playback clock so the sync loop is still exercisable.
 */
export class PreviewMusicProvider implements MusicProvider {
  readonly name = 'preview';

  private audio: HTMLAudioElement | null = null;
  /** Silent-clock fallback for platforms without HTMLAudioElement. */
  private clockStartedAt: number | null = null;
  private clockOffsetMs = 0;
  private tracks: Map<string, Track>;

  constructor(tracks: Track[] = []) {
    this.tracks = new Map(tracks.map((t) => [t.id, t]));
  }

  /** The stub pool is hydrated by the channel, not a live catalog. */
  registerTracks(tracks: Track[]): void {
    for (const t of tracks) this.tracks.set(t.id, t);
  }

  async authorize(): Promise<MusicTier> {
    return 'preview';
  }

  async subscriptionStatus(): Promise<MusicTier> {
    return 'preview';
  }

  async getTrack(trackId: string): Promise<Track | null> {
    return this.tracks.get(trackId) ?? null;
  }

  async search(query: string, limit = 10): Promise<Track[]> {
    const q = query.toLowerCase();
    return [...this.tracks.values()]
      .filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(q))
      .slice(0, limit);
  }

  async getPreviewUrl(trackId: string): Promise<string | null> {
    return this.tracks.get(trackId)?.previewUrl ?? null;
  }

  async play(trackId: string, positionMs: number): Promise<void> {
    const previewUrl = await this.getPreviewUrl(trackId);
    // Previews are 30s; the channel position can be deeper into the real
    // track. Loop the preview against the channel clock so the room never
    // goes silent mid-track.
    const previewPositionMs = positionMs % 30_000;

    if (typeof Audio !== 'undefined' && previewUrl) {
      if (!this.audio || this.audio.src !== previewUrl) {
        this.audio?.pause();
        this.audio = new Audio(previewUrl);
        this.audio.loop = true;
      }
      this.audio.currentTime = previewPositionMs / 1000;
      await this.audio.play();
    }
    this.clockOffsetMs = positionMs;
    this.clockStartedAt = Date.now();
  }

  async pause(): Promise<void> {
    this.audio?.pause();
    if (this.clockStartedAt !== null) {
      this.clockOffsetMs += Date.now() - this.clockStartedAt;
      this.clockStartedAt = null;
    }
  }

  async seek(positionMs: number): Promise<void> {
    if (this.audio) this.audio.currentTime = (positionMs % 30_000) / 1000;
    this.clockOffsetMs = positionMs;
    if (this.clockStartedAt !== null) this.clockStartedAt = Date.now();
  }

  position(): number | null {
    if (this.clockStartedAt === null) return null;
    return this.clockOffsetMs + (Date.now() - this.clockStartedAt);
  }

  destroy(): void {
    this.audio?.pause();
    this.audio = null;
    this.clockStartedAt = null;
  }
}
