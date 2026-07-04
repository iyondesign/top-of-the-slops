import type { ChatMessage, Track, UserProfile } from '../types';
import { getTrackFromPool, subscribeChannelState } from '../channel/channelClient';
import type { ChatTransport } from './chatClient';

/**
 * Local dev chat: your messages echo instantly, and a simulated crowd
 * reacts to track changes so the room reads as alive (plan §9). All
 * simulation lives here and disappears the moment Firestore chat is
 * configured.
 *
 * The phrase pools below are intentionally large and varied so the demo
 * room mimics the range of a real live chat — hype, boos, lurker vibing,
 * voting-culture callouts, community banter, arrivals — without ever
 * repeating itself into obvious fakeness. These are canned strings picked
 * at random (no AI), plus a few track-aware templates for lines that name
 * the current song/artist.
 */

const CROWD = [
  { userId: 'sim-1', handle: 'neon-needle-07', avatar: '👾' },
  { userId: 'sim-2', handle: 'velvet-woofer-42', avatar: '🕺' },
  { userId: 'sim-3', handle: 'glitchy-encore-88', avatar: '📼' },
  { userId: 'sim-4', handle: 'cosmic-fader-19', avatar: '🛸' },
  { userId: 'sim-5', handle: 'crispy-chorus-55', avatar: '🌈' },
  { userId: 'sim-6', handle: 'dusty-boombox-03', avatar: '🎧' },
  { userId: 'sim-7', handle: 'feral-jukebox-71', avatar: '💃' },
  { userId: 'sim-8', handle: 'moody-synth-12', avatar: '🎹' },
  { userId: 'sim-9', handle: 'turbo-remix-40', avatar: '🔥' },
  { userId: 'sim-10', handle: 'lofi-cassette-88', avatar: '🌙' },
  { userId: 'sim-11', handle: 'retro-groove-26', avatar: '🕹️' },
  { userId: 'sim-12', handle: 'electric-fader-09', avatar: '⚡' },
];

/** General banger-side hype. */
const HYPE = [
  'oh this one goes HARD 🔥',
  'the drop tho 😮‍💨',
  'calling it now — banger',
  'this is why I tune in',
  'volume UP 🔊',
  'okay OKAY who put this on, respect',
  'certified 🔥, no notes',
  'this slaps and I will not be taking questions',
  'immediate add to the personal rotation',
  'the way this hits at this hour is criminal',
  'we are SO back',
  'goosebumps fr',
  'this is a whole vibe',
  'production on this is insane',
  'chefs kiss 🤌',
  'undefeated track honestly',
  'i would let this play twice',
  'the crowd is EATING tonight',
  'front page of the countdown for sure',
  'somebody frame this one',
  'that bassline just paid my rent',
  'yeah this is getting my 🔥',
  'instant classic, sorry not sorry',
  'this belongs at #1',
  'no because why is this actually good',
];

/** Slop-side boos and roasts. */
const BOO = [
  'certified slop lmao 💩',
  'skip skip skip',
  'my ears are filing a complaint',
  'who queued this 😭',
  'this is the audio equivalent of beige',
  'boo this track 💩',
  'we need a mercy rule for this one',
  'not the AI slop starter pack 💀',
  'i have heard elevators with more range',
  'nah this one’s getting the 💩 from me',
  'somebody hit the boo button PLEASE',
  'this is a crime against the aux cord',
  'get it off get it off 😩',
  'the disrespect to my eardrums',
  'i would pay to skip this',
  'this ain’t it chief',
  'straight to the slop pile',
  'even the vinyl is embarrassed',
  'who hurt the producer',
  'negative rizz track',
  'this belongs in the shadow realm',
  'booing in advance to save time',
];

/** Ambivalent / curious — the honest middle. */
const CURIOUS = [
  'wait I actually like this??',
  'hmm jury’s still out',
  'this is growing on me ngl',
  'i can’t tell if this is genius or garbage',
  'give it 30 more seconds',
  'weirdly into this',
  'is this a banger or am I just tired',
  'the intro lied to me',
  'ok the second half redeemed it',
  'conflicted honestly',
  'this is either top 10 or bottom 10 no in between',
  'my foot is tapping against my will',
  'don’t know what this is but I respect it',
  'starting rough but I see the vision',
  'someone tell me how to feel about this',
];

/** Lurker / ambient vibing. */
const VIBE = [
  'just here vibing 🌙',
  'good background for the grind',
  'tuning in from the night shift o7',
  'chat is cozy tonight',
  'anyone else just leaving this on all day',
  'perfect study soundtrack',
  '3am and the room’s still going, love it',
  'lurking but present ✋',
  'this channel > my playlists lately',
  'coffee + slop channel, elite combo',
  'quiet night but a good one',
  'been here 2 hours send help (jk)',
  'the ambiance is immaculate',
  'no thoughts just tunes',
  'clocking in for my daily slop 🫡',
];

/** Voting-culture / countdown / TRL callouts. */
const VOTING = [
  'get your votes in people 🔥/💩',
  'this is a top 5 lock',
  'we booed the last one off in record time lol',
  'tastemaker board is BRUTAL today',
  'called that banger early, where’s my cred 😤',
  'countdown’s gonna be stacked this week',
  'vote with your heart not your ears smh',
  'the people’s champ right here',
  'hype-to-replay this immediately',
  'someone’s farming tastemaker points fr',
  'if this doesn’t chart I’m rioting',
  'boo brigade assemble 💩',
  'my votes have been IMMACULATE lately',
  'this one’s got replay energy',
  'protect this track at all costs',
];

/** Community / meta / arrivals. */
const COMMUNITY = [
  'gm slop nation ☀️',
  'what’d I miss, anything crazy?',
  'new here, this is such a cool idea',
  'shoutout to whoever’s curating tonight',
  'the vinyl spin is so satisfying btw',
  'first time the room’s felt this alive',
  'brb making tea, keep it warm',
  'back, what are we booing',
  'hi chat 👋',
  'how is everyone tonight',
  'love that we all hear the same thing at once',
  'this is basically MTV in my pocket',
  'ok this app is dangerous for my productivity',
  'invited three friends, they’re hooked',
  'the tastemaker grind never sleeps',
];

/** Track-aware templates — occasionally name the current song/artist. */
const TRACK_TEMPLATES: Array<(t: Track) => string> = [
  (t) => `${t.title.toLowerCase()}… bold choice`,
  (t) => `${t.artist} really said "trust me" huh`,
  (t) => `not "${t.title}" catching me off guard`,
  (t) => `${t.artist} in the building 🔥`,
  (t) => `"${t.title}" is either a banger or a war crime, deciding now`,
  (t) => `whoever put on ${t.artist}, i owe you one`,
  (t) => `${t.title} >>> whatever played before it`,
  (t) => `first time hearing ${t.artist} and… oh`,
  (t) => `add "${t.title}" to the countdown immediately`,
  (t) => `${t.artist} does NOT miss`,
];

/** One-off arrival lines used when a sim "joins" the room. */
const GREETINGS = [
  'just tuned in 📻',
  'pulled up 🛸',
  'clocking in 🫡',
  'evening chat 👋',
  'what’s spinning',
];

const ALL_REACTIONS = [...HYPE, ...BOO, ...CURIOUS, ...VIBE, ...VOTING, ...COMMUNITY];

const MAX_MESSAGES = 50;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
    // One to three crowd members react in the seconds after each track
    // change — staggered so it reads like people typing, not a burst.
    this.stopAmbient = subscribeChannelState((state) => {
      if (Date.now() - state.startedAtServerMs > 2_000) return;
      const reactions = 1 + Math.floor(Math.random() * 3);
      const speakers = new Set<string>();
      for (let i = 0; i < reactions; i += 1) {
        const delay = 1_500 + Math.random() * 9_000;
        setTimeout(() => {
          const who = pick(CROWD);
          if (speakers.has(who.userId)) return; // one line per person per track
          speakers.add(who.userId);
          const track = getTrackFromPool(state.currentTrackId);
          this.push({
            id: `amb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            userId: who.userId,
            handle: who.handle,
            avatar: who.avatar,
            text: this.line(track),
            createdAtMs: Date.now(),
          });
        }, delay);
      }
    });
  }

  /** Weighted phrase selection: mostly general reactions, sometimes a
   * track-aware line, occasionally an arrival greeting. */
  private line(track: Track | null): string {
    const roll = Math.random();
    if (track && roll < 0.18) return pick(TRACK_TEMPLATES)(track);
    if (roll < 0.24) return pick(GREETINGS);
    return pick(ALL_REACTIONS);
  }

  private push(message: ChatMessage): void {
    this.messages = [...this.messages, message].slice(-MAX_MESSAGES);
    this.listeners.forEach((l) => l(this.messages));
  }
}
