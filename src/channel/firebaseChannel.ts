import type { AppConfig, ChannelState, Leaderboards, Track, VoteValue } from '../types';
import { trackPlayId } from '../types';
import { getFirebase } from '../firebase';
import type { ChannelTransport } from './transport';

/**
 * M2 transport: follows the server-authoritative channel on RTDB.
 *
 * - /app/config, /channels/global/state, /tracks — read-only follows
 *   (only the conductor's Admin SDK writes the timeline; see
 *   firebase/database.rules.json).
 * - serverNow() = Date.now() + /.info/serverTimeOffset — the shared clock
 *   that makes ±750ms sync hold (refreshed automatically by the SDK on
 *   reconnect).
 * - /presence/{uid} with onDisconnect().remove() — the conductor
 *   aggregates listenerCount from this.
 * - Votes are written to Firestore votes/{voteId}; live tallies come back
 *   through ChannelState (the conductor aggregates them server-side).
 */
export class FirebaseChannelTransport implements ChannelTransport {
  private tracks = new Map<string, Track>();
  private offsetMs = 0;
  private lastState: ChannelState | null = null;
  private lastVote: { playId: string; value: VoteValue } | null = null;

  subscribeState(listener: (state: ChannelState) => void): () => void {
    return this.rtdbSubscribe('channels/global/state', (value) => {
      if (!value) return;
      this.lastState = value as ChannelState;
      listener(this.lastState);
    });
  }

  subscribeConfig(listener: (config: AppConfig) => void): () => void {
    return this.rtdbSubscribe('app/config', (value) => {
      listener({ isLive: value?.isLive ?? false, chatEnabled: value?.chatEnabled ?? false });
    });
  }

  subscribeTracks(listener: (tracks: Track[]) => void): () => void {
    return this.rtdbSubscribe('tracks', (value) => {
      this.tracks = new Map(
        Object.entries(value ?? {}).map(([id, t]: [string, any]) => [id, { id, ...t } as Track]),
      );
      listener([...this.tracks.values()]);
    });
  }

  subscribeLeaderboards(listener: (boards: Leaderboards) => void): () => void {
    return this.rtdbSubscribe('channels/global/leaderboards', (value) => {
      listener({ tracks: value?.tracks ?? [], tastemakers: value?.tastemakers ?? [] });
    });
  }

  subscribeBooedOff(listener: (track: Track) => void): () => void {
    // Booed-off transitions are observable as an early version bump with
    // a slop majority; the conductor also records it on the play. Client
    // banner derives from state deltas.
    let prev: ChannelState | null = null;
    return this.subscribeState((state) => {
      if (
        prev &&
        state.version > prev.version &&
        this.serverNow() < prev.nextAdvanceAtMs - 2_000 &&
        prev.liveSlopCount > prev.liveFireCount
      ) {
        const track = this.tracks.get(prev.currentTrackId);
        if (track) listener(track);
      }
      prev = state;
    });
  }

  getTrack(trackId: string): Track | null {
    return this.tracks.get(trackId) ?? null;
  }

  serverNow(): number {
    return Date.now() + this.offsetMs;
  }

  attachPresence(uid: string): void {
    void (async () => {
      const firebase = await getFirebase();
      if (!firebase) return;
      const { getDatabase, ref, onValue, onDisconnect, set, serverTimestamp } = await import(
        'firebase/database'
      );
      const db = getDatabase(firebase.app);

      onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
        this.offsetMs = snap.val() ?? 0;
      });
      // Re-arm presence on every (re)connect; hard closes are cleaned up
      // server-side by onDisconnect.
      onValue(ref(db, '.info/connected'), (snap) => {
        if (!snap.val()) return;
        const presenceRef = ref(db, `presence/${uid}`);
        void onDisconnect(presenceRef)
          .remove()
          .then(() => set(presenceRef, { online: true, lastSeen: serverTimestamp() }));
      });
    })();
  }

  async castVote(
    userId: string,
    handle: string,
    avatar: string,
    value: VoteValue,
    currentState: ChannelState,
  ): Promise<boolean> {
    const firebase = await getFirebase();
    if (!firebase) return false;
    const playId = trackPlayId(currentState);
    if (this.lastVote?.playId === playId) return false;

    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    // Deterministic doc id enforces one-vote-per-user-per-play at the
    // rules layer too (create-only, no overwrite).
    await setDoc(doc(firebase.firestore, 'votes', `${playId}:${userId}`), {
      userId,
      handle,
      avatar,
      trackPlayId: playId,
      trackId: currentState.currentTrackId,
      value,
      createdAt: serverTimestamp(),
    });
    this.lastVote = { playId, value };
    return true;
  }

  getUserVote(_userId: string): VoteValue | null {
    if (!this.lastState || !this.lastVote) return null;
    return this.lastVote.playId === trackPlayId(this.lastState) ? this.lastVote.value : null;
  }

  private rtdbSubscribe(path: string, handler: (value: any) => void): () => void {
    let unsubscribe: (() => void) | null = null;
    let disposed = false;
    void (async () => {
      const firebase = await getFirebase();
      if (!firebase || disposed) return;
      const { getDatabase, ref, onValue } = await import('firebase/database');
      const db = getDatabase(firebase.app);
      unsubscribe = onValue(ref(db, path), (snap) => handler(snap.val()));
    })();
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }
}
