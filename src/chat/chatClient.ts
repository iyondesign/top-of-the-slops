import type { ChatMessage, UserProfile } from '../types';
import { isFirebaseConfigured } from '../firebase';
import { FirestoreChat } from './firestoreChat';
import { StubChat } from './stubChat';

/**
 * M3 chat, same swap-point pattern as the channel: Firestore transport
 * when Firebase is configured, ambient local stub otherwise. Client-side
 * rate limiting here; server-side rules + Gemini-assisted moderation are
 * the backend half (firestore.rules now, moderation function post-MVP).
 */

export interface ChatTransport {
  subscribe(listener: (messages: ChatMessage[]) => void): () => void;
  send(profile: UserProfile, text: string): Promise<void>;
}

const RATE_LIMIT_MS = 2_000;
const MAX_LENGTH = 280;

const transport: ChatTransport = isFirebaseConfigured() ? new FirestoreChat() : new StubChat();

let lastSentAt = 0;

export function subscribeChat(listener: (messages: ChatMessage[]) => void): () => void {
  return transport.subscribe(listener);
}

export type SendResult = 'sent' | 'rate-limited' | 'empty' | 'too-long';

export async function sendChatMessage(profile: UserProfile, text: string): Promise<SendResult> {
  const trimmed = text.trim();
  if (!trimmed) return 'empty';
  if (trimmed.length > MAX_LENGTH) return 'too-long';
  const now = Date.now();
  if (now - lastSentAt < RATE_LIMIT_MS) return 'rate-limited';
  lastSentAt = now;
  await transport.send(profile, trimmed);
  return 'sent';
}
