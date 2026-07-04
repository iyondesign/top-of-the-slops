import type { ChatMessage, UserProfile } from '../types';
import { getFirebase } from '../firebase';
import type { ChatTransport } from './chatClient';

/**
 * Firestore chat transport: channels/global/messages, last 50, live.
 * Writes are constrained by firestore.rules (own uid, length cap);
 * LLM-assisted moderation and report tooling harden this in M3's
 * server half.
 */
export class FirestoreChat implements ChatTransport {
  subscribe(listener: (messages: ChatMessage[]) => void): () => void {
    let unsubscribe: (() => void) | null = null;
    let disposed = false;
    void (async () => {
      const firebase = await getFirebase();
      if (!firebase || disposed) return;
      const { collection, onSnapshot, orderBy, query, limitToLast } = await import(
        'firebase/firestore'
      );
      const q = query(
        collection(firebase.firestore, 'channels/global/messages'),
        orderBy('createdAt', 'asc'),
        limitToLast(50),
      );
      unsubscribe = onSnapshot(q, (snap) => {
        listener(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId,
              handle: data.handle,
              avatar: data.avatar,
              text: data.text,
              createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
            };
          }),
        );
      });
    })();
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }

  async send(profile: UserProfile, text: string): Promise<void> {
    const firebase = await getFirebase();
    if (!firebase) return;
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(firebase.firestore, 'channels/global/messages'), {
      userId: profile.uid,
      handle: profile.handle,
      avatar: profile.avatar,
      text,
      createdAt: serverTimestamp(),
    });
  }
}
