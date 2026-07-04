import type {
  AppConfig,
  ChannelState,
  Leaderboards,
  TastemakerEntry,
  Track,
  TrackBoardEntry,
  VoteValue,
} from '../types';
import { trackPlayId } from '../types';

/**
 * Stub conductor: a client-local loop that advances a curated pool and
 * emits ChannelState in exactly the shape the real M2 Cloud Run conductor
 * writes to RTDB (see server/conductor). The UI subscribes through
 * channelClient and never knows the difference.
 *
 * It also carries the M4 crowd loop locally — votes, boo-to-skip,
 * hype-to-replay, cooldowns, and both leaderboards — plus a simulated
 * crowd so the room feels populated in dev (plan §9: the room must feel
 * alive at 3am). Everything simulated is confined to this file; the
 * facades (channelClient, voteClient) present the same API the Firebase
 * transports implement.
 */

/** Previews are 30s clips, so the stub rotates on a 30s boundary. */
const STUB_TRACK_DURATION_MS = 30_000;
const POOL_SEARCH_TERMS = ['synthwave', 'hyperpop', 'disco'];

/** M4 guardrails (admin-set in /channels/global/meta once live). */
const BOO_MIN_VOTES = 6;
const BOO_LISTENER_FRACTION = 0.4;
const HYPE_REPLAY_NET = 8;
const REPLAY_COOLDOWN_PLAYS = 3;

/** Offline fallback so the hero never dead-screens without network. */
const FALLBACK_POOL: Track[] = [
  { id: 'stub-1', title: 'Midnight Static', artist: 'The Slop Machines', artworkUrl: '', previewUrl: null, durationMs: STUB_TRACK_DURATION_MS, source: 'apple' },
  { id: 'stub-2', title: 'Banger Protocol', artist: 'VJAI & The Countdown', artworkUrl: '', previewUrl: null, durationMs: STUB_TRACK_DURATION_MS, source: 'apple' },
  { id: 'stub-3', title: 'Certified Vinyl', artist: 'Tastemaker Court', artworkUrl: '', previewUrl: null, durationMs: STUB_TRACK_DURATION_MS, source: 'apple' },
];

const CROWD = [
  { userId: 'sim-1', handle: 'neon-needle-07', avatar: '👾' },
  { userId: 'sim-2', handle: 'velvet-woofer-42', avatar: '🕺' },
  { userId: 'sim-3', handle: 'glitchy-encore-88', avatar: '📼' },
  { userId: 'sim-4', handle: 'cosmic-fader-19', avatar: '🛸' },
  { userId: 'sim-5', handle: 'crispy-chorus-55', avatar: '🌈' },
];

type Listener<T> = (value: T) => void;

interface PlayRecord {
  track: Track;
  startedAtMs: number;
  fire: number;
  slop: number;
  booedOff: boolean;
  /** uid -> {value, early} — early = cast in the first third of the play. */
  votes: Map<string, { value: VoteValue; early: boolean }>;
}

export class StubChannel {
  private pool: Track[] = FALLBACK_POOL;
  private poolIndex = -1;
  private state: ChannelState | null = null;
  private config: AppConfig = { isLive: true, chatEnabled: true };

  private currentPlay: PlayRecord | null = null;
  private history: PlayRecord[] = [];
  private tastemakerScores = new Map<string, TastemakerEntry>();

  private stateListeners = new Set<Listener<ChannelState>>();
  private configListeners = new Set<Listener<AppConfig>>();
  private trackListeners = new Set<Listener<Track[]>>();
  private boardListeners = new Set<Listener<Leaderboards>>();
  private skipListeners = new Set<Listener<Track>>();

  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private ambientTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.hydratePool().then(() => {
      this.advance();
      // Ambient liveliness (plan §9): listener drift + simulated crowd
      // votes so tallies and boards move in dev. Replaced by real
      // presence + real votes once Firebase is configured.
      this.ambientTimer = setInterval(() => this.ambientTick(), 4_000);
    });
  }

  stop(): void {
    this.started = false;
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    if (this.ambientTimer) clearInterval(this.ambientTimer);
    this.advanceTimer = null;
    this.ambientTimer = null;
  }

  getTracks(): Track[] {
    return this.pool;
  }

  /**
   * A listener adds a favorite to the shared candidate pool (plan §8:
   * favorites feed the curated pool the conductor plays for everyone).
   * In M2 this becomes a write to /channels/global/meta.poolTrackIds
   * behind admin guardrails; here it grows the local rotation live.
   * Returns false if the track is already in the pool.
   */
  addToPool(track: Track): boolean {
    if (this.pool.some((t) => t.id === track.id)) return false;
    // Requests jump the queue (live-radio rule): insert right after the
    // current rotation position so the contribution shows up at the top
    // of On Deck and plays soon — not appended 12 tracks out.
    // Durations clamp to the 30s preview boundary in stub mode.
    const clamped = {
      ...track,
      durationMs: Math.min(track.durationMs || STUB_TRACK_DURATION_MS, STUB_TRACK_DURATION_MS),
    };
    const next = [...this.pool];
    next.splice(Math.min(this.poolIndex + 1, next.length), 0, clamped);
    this.pool = next;
    this.addedAtMs.set(track.id, Date.now());
    this.trackListeners.forEach((l) => l(this.pool));
    return true;
  }

  private addedAtMs = new Map<string, number>();

  /**
   * The room's queue view: what the rotation will play next, in pool
   * order from the current track. (Hype-to-replay can occasionally jump
   * this — it's a live radio, not a locked tracklist.) In M2 this is
   * derived server-side from meta.poolTrackIds + recentPlays.
   */
  getUpNext(count = 8): Track[] {
    const n = this.pool.length;
    if (n === 0) return [];
    const out: Track[] = [];
    for (let step = 1; step <= n && out.length < count; step++) {
      const track = this.pool[(this.poolIndex + step) % n];
      if (track.id !== this.state?.currentTrackId) out.push(track);
    }
    return out;
  }

  /** Was this track contributed in the last few minutes? (NEW badge) */
  isRecentlyAdded(trackId: string, windowMs = 5 * 60_000): boolean {
    const at = this.addedAtMs.get(trackId);
    return at !== undefined && Date.now() - at < windowMs;
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

  onLeaderboards(listener: Listener<Leaderboards>): () => void {
    this.boardListeners.add(listener);
    listener(this.leaderboards());
    return () => this.boardListeners.delete(listener);
  }

  /** Fires when a track gets booed off (for the "skipped" banner). */
  onBooedOff(listener: Listener<Track>): () => void {
    this.skipListeners.add(listener);
    return () => this.skipListeners.delete(listener);
  }

  /**
   * One vote per user per track-play (plan §8.5). Returns false if this
   * uid already voted on the current play.
   */
  castVote(userId: string, handle: string, avatar: string, value: VoteValue): boolean {
    if (!this.currentPlay || !this.state) return false;
    if (this.currentPlay.votes.has(userId)) return false;
    const elapsed = Date.now() - this.currentPlay.startedAtMs;
    const early = elapsed < this.currentPlay.track.durationMs / 3;
    this.currentPlay.votes.set(userId, { value, early });
    if (value === 'fire') this.currentPlay.fire += 1;
    else this.currentPlay.slop += 1;
    if (!this.tastemakerScores.has(userId)) {
      this.tastemakerScores.set(userId, { userId, handle, avatar, score: 0 });
    }
    this.state = {
      ...this.state,
      liveFireCount: this.currentPlay.fire,
      liveSlopCount: this.currentPlay.slop,
    };
    this.emitState();
    this.checkBooToSkip();
    return true;
  }

  getUserVote(userId: string): VoteValue | null {
    return this.currentPlay?.votes.get(userId)?.value ?? null;
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

  /**
   * pickNext with the M4 crowd influence wired locally: mostly rotation
   * (cooldown implicit), but a heavily-🔥'd recent track can jump the
   * queue — hype-to-replay, within the replay-cooldown guardrail.
   */
  private pickNext(): Track {
    const recentIds = this.history.slice(-REPLAY_COOLDOWN_PLAYS).map((p) => p.track.id);
    const hyped = this.history.filter(
      (p) => p.fire - p.slop >= HYPE_REPLAY_NET && !recentIds.includes(p.track.id),
    );
    if (hyped.length > 0 && Math.random() < 0.3) {
      const winner = hyped[hyped.length - 1];
      return winner.track;
    }
    this.poolIndex = (this.poolIndex + 1) % this.pool.length;
    return this.pool[this.poolIndex];
  }

  private advance(early = false): void {
    if (!this.config.isLive || this.pool.length === 0) return;
    this.closeCurrentPlay(early);

    const track = this.pickNext();
    const now = Date.now();
    this.currentPlay = {
      track,
      startedAtMs: now,
      fire: 0,
      slop: 0,
      booedOff: false,
      votes: new Map(),
    };
    this.state = {
      currentTrackId: track.id,
      startedAtServerMs: now,
      durationMs: track.durationMs,
      isPlaying: true,
      version: (this.state?.version ?? 0) + 1,
      nextAdvanceAtMs: now + track.durationMs,
      listenerCount: this.state?.listenerCount ?? 12 + Math.floor(Math.random() * 30),
      liveFireCount: 0,
      liveSlopCount: 0,
    };
    this.emitState();
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    this.advanceTimer = setTimeout(() => this.advance(), track.durationMs);
  }

  /** Boo-to-skip (plan §8.8): 💩 majority past threshold ends the play. */
  private checkBooToSkip(): void {
    if (!this.currentPlay || !this.state) return;
    const threshold = Math.max(
      BOO_MIN_VOTES,
      Math.ceil(this.state.listenerCount * BOO_LISTENER_FRACTION),
    );
    if (
      this.currentPlay.slop >= threshold &&
      this.currentPlay.slop > this.currentPlay.fire
    ) {
      this.currentPlay.booedOff = true;
      const track = this.currentPlay.track;
      this.skipListeners.forEach((l) => l(track));
      this.advance(true);
    }
  }

  /** Finish the current play: archive it and settle tastemaker credit. */
  private closeCurrentPlay(early: boolean): void {
    const play = this.currentPlay;
    if (!play) return;
    this.currentPlay = null;
    this.history.push(play);
    if (this.history.length > 50) this.history.shift();

    // Tastemaker scoring (plan §8.6): reward 🔥 votes on tracks that end
    // net-positive — double credit for calling it in the first third.
    const net = play.fire - play.slop;
    for (const [userId, vote] of play.votes) {
      const entry = this.tastemakerScores.get(userId);
      if (!entry) continue;
      if (vote.value === 'fire' && net > 0) entry.score += vote.early ? 10 : 4;
      if (vote.value === 'slop' && (play.booedOff || net < 0)) entry.score += vote.early ? 6 : 2;
    }
    this.boardListeners.forEach((l) => l(this.leaderboards()));
    void early;
  }

  private leaderboards(): Leaderboards {
    const byTrack = new Map<string, TrackBoardEntry>();
    for (const play of this.history) {
      const existing = byTrack.get(play.track.id);
      if (existing) {
        existing.fire += play.fire;
        existing.slop += play.slop;
        existing.net = existing.fire - existing.slop;
        existing.playedAtMs = Math.max(existing.playedAtMs, play.startedAtMs);
        existing.booedOff = existing.booedOff || play.booedOff;
      } else {
        byTrack.set(play.track.id, {
          track: play.track,
          fire: play.fire,
          slop: play.slop,
          net: play.fire - play.slop,
          playedAtMs: play.startedAtMs,
          booedOff: play.booedOff,
        });
      }
    }
    const tracks = [...byTrack.values()].sort((a, b) => b.net - a.net).slice(0, 10);
    const tastemakers = [...this.tastemakerScores.values()]
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    return { tracks, tastemakers };
  }

  private ambientTick(): void {
    if (!this.state || !this.currentPlay) return;

    // Listener count wanders gently.
    const delta = Math.floor(Math.random() * 5) - 2;
    const listenerCount = Math.max(3, this.state.listenerCount + delta);

    // A few simulated crowd votes per play, 🔥-leaning with occasional
    // slop piles so boo-to-skip is observable in dev.
    if (Math.random() < 0.7) {
      const voter = CROWD[Math.floor(Math.random() * CROWD.length)];
      if (!this.currentPlay.votes.has(voter.userId)) {
        const slopStorm = Math.random() < 0.08;
        this.castVote(
          voter.userId,
          voter.handle,
          voter.avatar,
          slopStorm || Math.random() < 0.3 ? 'slop' : 'fire',
        );
      }
    }

    if (this.state && listenerCount !== this.state.listenerCount) {
      this.state = { ...this.state, listenerCount };
      this.emitState();
    }
  }

  private emitState(): void {
    if (this.state) this.stateListeners.forEach((l) => l(this.state!));
  }
}

/** Shared singleton — channelClient, voteClient, and boards all use it. */
export const stubChannel = new StubChannel();

export { trackPlayId };
