import type { ChatMessage, UserProfile } from '../types';
import { getTrackFromPool, subscribeChannelState } from '../channel/channelClient';
import type { ChatTransport } from './chatClient';

/**
 * Local dev chat: your messages echo instantly, and a simulated crowd
 * reacts to track changes so the room reads as alive (plan §9). All
 * simulation lives here and disappears the moment Firestore chat is
 * configured.
 */

const CROWD = [
  { userId: 'sim-1', handle: 'neon-needle-07', avatar: '👾' },
  { userId: 'sim-2', handle: 'velvet-woofer-42', avatar: '🕺' },
  { userId: 'sim-3', handle: 'glitchy-encore-88', avatar: '📼' },
  { userId: 'sim-4', handle: 'cosmic-fader-19', avatar: '🛸' },
];

const REACTIONS = [
  'oh this one goes HARD 🔥',
  'certified slop lmao 💩',
  'wait I actually like this??',
  'the drop tho',
  'calling it now — banger',
  'my ears are filing a complaint',
  'volume UP',
  'who queued this 😭',
  'this is why I tune in',
  'skip skip skip',
];

const MAX_MESSAGES = 50;

export class StubChat implements ChatTransport {
  private messages: ChatMessage[] = [
    {
      id: 'seed-1',
      userId: 'sim-1',
      handle: 'neon-needle-07',
      avatar: '👾',
      text: 'welcome to the slop channel 📺',
      createdAtMs: Date.now() - 60_000,
    },
  ];
  private listeners = new Set<(messages: ChatMessage[]) => void>();
  private stopAmbient: (() => void) | null = null;

  subscribe(listener: (messages: ChatMessage[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.messages);
    if (!this.stopAmbient) this.startAmbient();
    return () => this.listeners.delete(listener);
  }

  async send(profile: UserProfile, text: string): Promise<void> {
    this.push({
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: profile.uid,
      handle: profile.handle,
      avatar: profile.avatar,
      text,
      createdAtMs: Date.now(),
    });
  }

  private startAmbient(): void {
    // A crowd member reacts shortly after each track change.
    this.stopAmbient = subscribeChannelState((state) => {
      if (Date.now() - state.startedAtServerMs > 2_000) return;
      const delay = 2_000 + Math.random() * 6_000;
      setTimeout(() => {
        const who = CROWD[Math.floor(Math.random() * CROWD.length)];
        const track = getTrackFromPool(state.currentTrackId);
        const line =
          Math.random() < 0.25 && track
            ? `${track.title.toLowerCase()}… bold choice`
            : REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
        this.push({
          id: `amb-${Date.now()}`,
          userId: who.userId,
          handle: who.handle,
          avatar: who.avatar,
          text: line,
          createdAtMs: Date.now(),
        });
      }, delay);
    });
  }

  private push(message: ChatMessage): void {
    this.messages = [...this.messages, message].slice(-MAX_MESSAGES);
    this.listeners.forEach((l) => l(this.messages));
  }
}
