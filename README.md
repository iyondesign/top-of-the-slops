# 📺 Top of the Slops (TOTS)

**Appointment-based, communal music discovery — MTV TRL and Top of the Pops,
rebuilt for the streaming era.**

One always-on live channel that everyone tunes into together. The whole room
hears the same track at the same moment, reacts in a live chat, and votes
**🔥 banger** or **💩 slop**. Votes have teeth: a booed track gets skipped off
the channel, a hyped one earns a replay, and the tastemakers who call hits
early climb their own leaderboard. "Slop" is a badge, not an insult.

<p align="center"><em>MD-Vinyl visual DNA: oversized album art on a spinning
record, warm and tactile, wrapped in a live broadcast overlay.</em></p>

## How it works (the one-paragraph architecture)

No music API lets you rebroadcast audio to a room — a licensing wall, not an
API gap. So TOTS never streams audio: a server-side **conductor** owns one
authoritative channel state (`currentTrackId`, `startedAtServerMs`,
`isPlaying`, live tallies), and every client independently plays that track
via Apple Music, seeks to `serverNow − startedAt`, and drift-corrects to stay
within ±750 ms of the room. Apple Music subscribers hear full tracks;
everyone else hears the 30-second preview, looped against the channel clock.
All music-service calls sit behind a single `MusicProvider` adapter so a
second provider can slot in later.

## Quick start (zero config)

```bash
git clone https://github.com/iyondesign/top-of-the-slops.git
cd top-of-the-slops
npm install
npm run web
```

That's it. With no configuration the app runs **fully local**: a stub
conductor rotates a pool hydrated from the public iTunes Search API (real
artwork + 30s previews), you get an instant anonymous identity
(`velvet-woofer-42`-style handle, editable via the chip in the top bar), and
a simulated crowd keeps chat, votes, and both leaderboards moving so every
feature is exercisable offline.

Things to try in dev:

- **▶ Tap to tune in** — joins playback mid-track at the room's position.
- **🔥/💩** — one vote per track-play; watch the tally tug-of-war.
- **Long-press the LIVE pill** — flips the `isLive` failsafe to the off-air
  state (long-press the off-air card to resume).
- **Long-press a chat message** — mutes that user locally.

### Platforms

| Command | Target |
| --- | --- |
| `npm run web` | Web, desktop + mobile responsive |
| `npm run ios` | iOS / iPadOS — requires an [Expo development build](https://docs.expo.dev/develop/development-builds/introduction/), **not Expo Go** (MusicKit needs custom native code) |
| `npm run android` | Android (post-MVP; needs a MusicKit Android module) |

## Wiring up the real backends

Copy `.env.example` to `.env` and fill in what you have. Each layer
activates independently; everything else stays on stubs.

**1. Firebase** (identity, live channel, chat, votes, presence)

1. Create a Firebase project; enable **Realtime Database**, **Firestore**,
   and **Anonymous** sign-in.
2. Deploy the security rules in [`firebase/`](firebase/) — clients can only
   write their own user/presence/messages/votes; the channel timeline is
   conductor-only.
3. Put the web-app config values into `EXPO_PUBLIC_FIREBASE_*`.

**2. The conductor** (server-authoritative channel) — deploy
[`server/conductor/`](server/conductor/) to Cloud Run as a singleton with a
Cloud Scheduler watchdog. Full instructions in its README.

**3. Apple Music (MusicKit)** — join the Apple Developer Program, create a
MusicKit key, and mint a developer token into
`EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN`. Web playback uses MusicKit JS; the
native iOS module is the M0 milestone (placeholder at
`src/music/AppleMusicProvider.ts`).

## Repository layout

```
App.tsx                  app shell — desktop rails / mobile hero-first
src/
  music/                 MusicProvider adapter (MusicKit JS, native seam, preview tier)
  channel/               channel client: stub conductor ↔ Firebase RTDB transport
  chat/                  chat client: ambient local stub ↔ Firestore transport
  identity/              anonymous-first identity (auto handle + avatar)
  components/            VinylHero, VoteBar, ChatPanel, LeaderboardPanel, …
  hooks/                 useChannel, usePlayback (sync follower loop), useIdentity
server/conductor/        Cloud Run singleton that owns the channel timeline
firebase/                RTDB + Firestore security rules
docs/ARCHITECTURE.md     full architecture map and milestone seams
```

## Roadmap

| Milestone | Scope | Status |
| --- | --- | --- |
| M0 | MusicKit-in-Expo bridge (the #1 technical risk) | 🟡 web adapter done; native Expo Module pending |
| M1 | Anonymous shell: instant identity, MD-Vinyl hero, failsafes | ✅ (Firebase auth activates via env) |
| M2 | Server-authoritative conductor + presence | ✅ service + rules + client transport written; deploy pending |
| M3 | Live chat + moderation + kill switch | 🟡 client + rules done; Gemini-assisted moderation pending |
| M4 | Sign in with Apple, votes with cred, crowd-influenced queue, leaderboards | 🟡 voting loop + boards + conductor seams done; Apple auth pending |
| M5 | Polish + harden (recovery UX, trial upsell, analytics) | ⚪ |
| Phase 2 | AI slop made literal: Lyria generation, VJAI host, Veo videos, the countdown Show | ⚪ |

In the MVP, "slop" is pure playful branding on the Apple Music catalog — no
AI-generated music and no AI claims. Phase 2 re-takes the word by making
slop literal, on an all-Google AI stack (Vertex AI: Lyria, Gemini, Veo,
Imagen, Chirp).

## Development notes

- `npx tsc --noEmit` typechecks the client; `npm run typecheck` inside
  `server/conductor` covers the service.
- The stub layer (`src/channel/stubChannel.ts`, `src/chat/stubChat.ts`) is
  deliberately confined: every simulated behavior lives behind the same
  interfaces the Firebase transports implement, so nothing in the UI knows
  whether the room is real.
