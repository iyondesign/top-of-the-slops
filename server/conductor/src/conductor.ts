import type { Database } from 'firebase-admin/database';
import type { Firestore } from 'firebase-admin/firestore';

import type { AppConfig, ChannelMeta, ChannelState, Track } from './types.js';

/**
 * The conductor (fable spec M2): owns the channel clock. It decides the
 * current track and exactly when to advance, writes one ChannelState
 * node, and never streams audio — a conductor of state, not a media
 * server.
 *
 * Deploy as a Cloud Run singleton (min-instances=1, max-instances=1);
 * the version-guarded transaction in advance() is the belt-and-suspenders
 * that makes a stray second instance (or the watchdog racing the
 * in-process timer) unable to double-advance — the loser aborts.
 *
 * Clock: the conductor trusts its own process clock (Cloud Run is
 * NTP-disciplined); clients align to it through RTDB's
 * /.info/serverTimeOffset, so everyone shares one clock.
 */
export class Conductor {
  private advanceTimer: NodeJS.Timeout | null = null;
  private presenceTimer: NodeJS.Timeout | null = null;
  private stopVoteWatch: (() => void) | null = null;
  private isLive = true;

  /** M4 seam: vote influence off by default in M2 (VOTES_ENABLED=1). */
  private readonly votesEnabled = process.env.VOTES_ENABLED === '1';

  constructor(
    private db: Database,
    private firestore: Firestore,
  ) {}

  async start(): Promise<void> {
    await this.ensureConfig();
    this.watchIsLive();
    this.startPresenceAggregation();

    // Cold-start recovery: if a boundary passed while we were down,
    // advance; otherwise re-arm the timer for the live track.
    const state = await this.readState();
    const meta = await this.readMeta();
    if (!state || Date.now() >= state.nextAdvanceAtMs + meta.advanceGraceMs) {
      await this.advance();
    } else {
      this.scheduleAdvance(state.nextAdvanceAtMs - Date.now());
      this.watchVotes(state);
    }
  }

  /**
   * Watchdog entry point — Cloud Scheduler hits this every 60s. Only
   * advances if the boundary is genuinely past (idempotent recovery);
   * never blindly advances on a timer.
   */
  async tick(): Promise<string> {
    if (!this.isLive) return 'off-air';
    const state = await this.readState();
    const meta = await this.readMeta();
    if (!state) {
      await this.advance();
      return 'bootstrapped';
    }
    if (Date.now() >= state.nextAdvanceAtMs + meta.advanceGraceMs) {
      await this.advance();
      return 'recovered-missed-boundary';
    }
    return 'on-schedule';
  }

  /** M4 seam (inert unless VOTES_ENABLED): boo-to-skip early advance. */
  private async onEarlySkipSignal(state: ChannelState): Promise<void> {
    if (!this.votesEnabled) return;
    console.log(`[conductor] boo-to-skip: ${state.currentTrackId}`);
    await this.advance();
  }

  private async advance(): Promise<void> {
    if (!this.isLive) return;
    const meta = await this.readMeta();
    const state = await this.readState();
    const next = await this.pickNext(meta, state);
    if (!next) {
      console.warn('[conductor] no eligible track; retrying in 10s');
      this.scheduleAdvance(10_000);
      return;
    }

    const now = Date.now();
    const newState: ChannelState = {
      currentTrackId: next.id,
      startedAtServerMs: now,
      durationMs: next.track.durationMs,
      isPlaying: true,
      version: (state?.version ?? 0) + 1,
      nextAdvanceAtMs: now + next.track.durationMs,
      listenerCount: state?.listenerCount ?? 0,
      liveFireCount: 0,
      liveSlopCount: 0,
    };

    // Version-guarded transaction: if another writer moved version since
    // we read it, abort — exactly one advance per boundary.
    const expectVersion = state?.version ?? 0;
    const result = await this.db.ref('channels/global/state').transaction((current) => {
      if (current && current.version !== expectVersion) return; // abort
      return newState;
    });
    if (!result.committed) {
      console.log('[conductor] advance aborted (version moved) — dedupe worked');
      return;
    }

    await this.db.ref(`channels/global/recentPlays/${next.id}`).set(now);
    if (state) await this.settlePlay(state);
    console.log(`[conductor] now playing ${next.track.title} (${next.track.durationMs}ms)`);

    this.scheduleAdvance(next.track.durationMs);
    this.watchVotes(newState);
  }

  /**
   * pickNext: shuffle-through-eligible over the admin pool, skipping
   * anything inside cooldownMs. With votes enabled, a heavily-🔥'd
   * recent track can take the up-next slot (hype-to-replay).
   */
  private async pickNext(
    meta: ChannelMeta,
    state: ChannelState | null,
  ): Promise<{ id: string; track: Track } | null> {
    const recentSnap = await this.db.ref('channels/global/recentPlays').get();
    const recent: Record<string, number> = recentSnap.val() ?? {};
    const now = Date.now();

    const eligible = meta.poolTrackIds.filter((id) => {
      if (id === state?.currentTrackId) return false;
      const lastPlayed = recent[id];
      return !lastPlayed || now - lastPlayed >= meta.cooldownMs;
    });
    // Everything cooling down: fall back to least-recently-played.
    const candidates =
      eligible.length > 0
        ? eligible
        : [...meta.poolTrackIds]
            .filter((id) => id !== state?.currentTrackId)
            .sort((a, b) => (recent[a] ?? 0) - (recent[b] ?? 0))
            .slice(0, 3);
    if (candidates.length === 0) return null;

    let chosen = candidates[Math.floor(Math.random() * candidates.length)];

    if (this.votesEnabled) {
      const hyped = await this.mostHypedEligible(candidates);
      if (hyped && Math.random() < 0.3) chosen = hyped;
    }

    const trackSnap = await this.db.ref(`tracks/${chosen}`).get();
    const track: Track | null = trackSnap.val();
    return track ? { id: chosen, track } : null;
  }

  private async mostHypedEligible(candidates: string[]): Promise<string | null> {
    const boardSnap = await this.db.ref('channels/global/leaderboards/tracks').get();
    const board: Array<{ trackId: string; net: number }> = boardSnap.val() ?? [];
    const hit = board.find((b) => b.net >= 8 && candidates.includes(b.trackId));
    return hit?.trackId ?? null;
  }

  /** Live vote tally for the current play, from Firestore votes/. */
  private watchVotes(state: ChannelState): void {
    this.stopVoteWatch?.();
    const playId = `${state.currentTrackId}@${state.startedAtServerMs}`;
    const unsubscribe = this.firestore
      .collection('votes')
      .where('trackPlayId', '==', playId)
      .onSnapshot(async (snap) => {
        let fire = 0;
        let slop = 0;
        snap.forEach((doc) => {
          if (doc.data().value === 'fire') fire += 1;
          else slop += 1;
        });
        await this.db
          .ref('channels/global/state')
          .update({ liveFireCount: fire, liveSlopCount: slop });

        // Boo-to-skip guardrails: absolute floor AND listener fraction.
        const current = await this.readState();
        if (!current || `${current.currentTrackId}@${current.startedAtServerMs}` !== playId) return;
        const threshold = Math.max(6, Math.ceil(current.listenerCount * 0.4));
        if (slop >= threshold && slop > fire) await this.onEarlySkipSignal(current);
      });
    this.stopVoteWatch = unsubscribe;
  }

  /** Archive a finished play into the leaderboards node. */
  private async settlePlay(finished: ChannelState): Promise<void> {
    const trackSnap = await this.db.ref(`tracks/${finished.currentTrackId}`).get();
    const track: Track | null = trackSnap.val();
    if (!track) return;
    const boardRef = this.db.ref('channels/global/leaderboards/tracks');
    const boardSnap = await boardRef.get();
    const board: Array<any> = boardSnap.val() ?? [];
    const existing = board.find((b) => b.trackId === finished.currentTrackId);
    if (existing) {
      existing.fire += finished.liveFireCount;
      existing.slop += finished.liveSlopCount;
      existing.net = existing.fire - existing.slop;
      existing.playedAtMs = finished.startedAtServerMs;
    } else {
      board.push({
        trackId: finished.currentTrackId,
        track: { id: finished.currentTrackId, ...track },
        fire: finished.liveFireCount,
        slop: finished.liveSlopCount,
        net: finished.liveFireCount - finished.liveSlopCount,
        playedAtMs: finished.startedAtServerMs,
        booedOff: false,
      });
    }
    board.sort((a, b) => b.net - a.net);
    await boardRef.set(board.slice(0, 20));
    // Tastemaker settlement (who called it early) is computed from the
    // Firestore votes log — wired fully in M4 alongside Sign in with
    // Apple, when votes become durable identity.
  }

  /**
   * listenerCount from /presence — polled server-side so clients never
   * download the whole presence list just to show a number.
   */
  private startPresenceAggregation(): void {
    this.presenceTimer = setInterval(async () => {
      const snap = await this.db.ref('presence').get();
      const count = snap.numChildren();
      const state = await this.readState();
      if (state && state.listenerCount !== count) {
        await this.db.ref('channels/global/state').update({ listenerCount: count });
      }
    }, 15_000);
  }

  /** isLive=false pauses everyone; true resumes with a fresh advance. */
  private watchIsLive(): void {
    this.db.ref('app/config/isLive').on('value', async (snap) => {
      const wasLive = this.isLive;
      this.isLive = snap.val() !== false;
      if (wasLive && !this.isLive) {
        if (this.advanceTimer) clearTimeout(this.advanceTimer);
        await this.db.ref('channels/global/state').update({ isPlaying: false });
        console.log('[conductor] off air');
      } else if (!wasLive && this.isLive) {
        console.log('[conductor] back on air');
        await this.advance();
      }
    });
  }

  private scheduleAdvance(inMs: number): void {
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    this.advanceTimer = setTimeout(() => {
      void this.advance();
    }, inMs);
  }

  private async ensureConfig(): Promise<void> {
    const ref = this.db.ref('app/config');
    const snap = await ref.get();
    if (!snap.exists()) await ref.set({ isLive: true, chatEnabled: true });
  }

  private async readState(): Promise<ChannelState | null> {
    return (await this.db.ref('channels/global/state').get()).val();
  }

  private async readMeta(): Promise<ChannelMeta> {
    const meta = (await this.db.ref('channels/global/meta').get()).val();
    if (!meta) throw new Error('channels/global/meta missing — run pool hydration');
    return meta as ChannelMeta;
  }
}
