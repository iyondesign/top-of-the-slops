import type { AppConfig, ChannelState, Track } from '../types';

/**
 * M1 stub conductor (carried from M0): a client-local loop that advances a
 * curated pool and emits ChannelState in exactly the shape the real M2
 * Cloud Run conductor will write to RTDB. The UI subscribes through
 * channelClient and never knows the difference — M2 swaps the transport,
 * not the contract.
 *
 * Deliberate M2 parallels: round-robin pickNext with a cooldown, version
 * increments on every advance, nextAdvanceAtMs scheduling. Deliberate
 * omissions: no server clock (local Date.now stands in for
 * /.info/serverTimeOffset), no transaction guard (single writer here).
 */

/** Previews are 30s clips, so the stub rotates on a 30s boundary. */
const STUB_TRACK_DURATION_MS = 30_000;
const POOL_SEARCH_TERMS = ['synthwave', 'hyperpop', 'disco'];

/** Offline fallback so the hero never dead-screens without network. */
const FALLBACK_POOL: Track[] = [
  {
    id: 'stub-1',
    title: 'Midnight Static',
    artist: 'The Slop Machines',
    artworkUrl: '',
    previewUrl: null,
    durationMs: STUB_TRACK_DURATION_MS,
    source: 'apple',
  },
  {
    id: 'stub-2',
    title: 'Banger Protocol',
    artist: 'VJAI & The Countdown',
    artworkUrl: '',
    previewUrl: null,
    durationMs: STUB_TRACK_DURATION_MS,
    source: 'apple',
  },
  {
    id: 'stub-3',
    title: 'Certified Vinyl',
    artist: 'Tastemaker Court',
    artworkUrl: '',
    previewUrl: null,
    durationMs: STUB_TRACK_DURATION_MS,
    source: 'apple',
  },
];

type Listener<T> = (value: T) => void;

export class StubChannel {
  private pool: Track[] = FALLBACK_POOL;
  private poolIndex = -1;
  private state: ChannelState | null = null;
  private config: AppConfig = { isLive: true, chatEnabled: true };

  private stateListeners = new Set<Listener<ChannelState>>();
  private configListeners = new Set<Listener<AppConfig>>();
  private trackListeners = new Set<Listener<Track[]>>();

  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private listenerDriftTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.hydratePool().then(() => {
      this.advance();
      // Ambient liveliness (plan §9): a stubbed listener count that
      // wanders gently so the room reads as populated. Replaced by real
      // presence in M2.
      this.listenerDriftTimer = setInterval(() => this.driftListeners(), 5_000);
    });
  }

  stop(): void {
    this.started = false;
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    if (this.listenerDriftTimer) clearInterval(this.listenerDriftTimer);
    this.advanceTimer = null;
    this.listenerDriftTimer = null;
  }

  getTracks(): Track[] {
    return this.pool;
  }

  onState(listener: Listener<ChannelState>): () => void {
    this.stateListeners.add(listener);
    if (this.state) listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  onConfig(listener: Listener<AppConfig>): () => void {
    this.configListeners.add(listener);
    listener(this.config);
    return () => this.configListeners.delete(listener);
  }

  onTracks(listener: Listener<Track[]>): () => void {
    this.trackListeners.add(listener);
    listener(this.pool);
    return () => this.trackListeners.delete(listener);
  }

  /** Dev-only failsafe toggle, until /app/config lives in Firebase. */
  setConfig(partial: Partial<AppConfig>): void {
    this.config = { ...this.config, ...partial };
    this.configListeners.forEach((l) => l(this.config));
    if (!this.config.isLive) {
      if (this.advanceTimer) clearTimeout(this.advanceTimer);
      if (this.state) {
        this.state = { ...this.state, isPlaying: false, version: this.state.version + 1 };
        this.emitState();
      }
    } else {
      // isLive flipped back on -> fresh advance, like the real conductor.
      this.advance();
    }
  }

  private async hydratePool(): Promise<void> {
    try {
      const term = POOL_SEARCH_TERMS[Math.floor(Math.random() * POOL_SEARCH_TERMS.length)];
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=12`,
      );
      if (!res.ok) return;
      const json = await res.json();
      const tracks: Track[] = (json.results ?? [])
        .filter((r: any) => r.previewUrl)
        .map((r: any) => ({
          id: String(r.trackId),
          title: r.trackName,
          artist: r.artistName,
          artworkUrl: String(r.artworkUrl100 ?? '').replace('100x100', '600x600'),
          previewUrl: r.previewUrl,
          durationMs: STUB_TRACK_DURATION_MS,
          source: 'apple' as const,
        }));
      if (tracks.length > 0) {
        this.pool = tracks;
        this.trackListeners.forEach((l) => l(this.pool));
      }
    } catch {
      // Fallback pool already in place; the hero still renders.
    }
  }

  /** Round-robin pickNext — cooldown is implicit in strict rotation. */
  private advance(): void {
    if (!this.config.isLive || this.pool.length === 0) return;
    this.poolIndex = (this.poolIndex + 1) % this.pool.length;
    const track = this.pool[this.poolIndex];
    const now = Date.now();
    this.state = {
      currentTrackId: track.id,
      startedAtServerMs: now,
      durationMs: track.durationMs,
      isPlaying: true,
      version: (this.state?.version ?? 0) + 1,
      nextAdvanceAtMs: now + track.durationMs,
      listenerCount: this.state?.listenerCount ?? 12 + Math.floor(Math.random() * 30),
    };
    this.emitState();
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    this.advanceTimer = setTimeout(() => this.advance(), track.durationMs);
  }

  private driftListeners(): void {
    if (!this.state) return;
    const delta = Math.floor(Math.random() * 5) - 2;
    const count = Math.max(3, this.state.listenerCount + delta);
    if (count !== this.state.listenerCount) {
      this.state = { ...this.state, listenerCount: count };
      this.emitState();
    }
  }

  private emitState(): void {
    if (this.state) this.stateListeners.forEach((l) => l(this.state!));
  }
}
