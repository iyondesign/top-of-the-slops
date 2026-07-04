# Release Notes & Capability Audit Trail

Every capability TOTS has shipped, when it landed, and where it lives in the
code. This is the durable record — refer here to answer "do we have X yet, and
since when?" The format follows [Keep a Changelog](https://keepachangelog.com);
milestone labels (M0–M5, Phase 2) map to the build sequence in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the product plan §19.

Status legend: ✅ shipped · 🟡 partial (stub/seam in place, backend or native
half pending) · ⚪ not started.

---

## [0.2.0] — 2026-07-04 — M2 Conductor · M3 Chat · M4 Voting & Leaderboards

Commit `d5b8bd7`. Pushed the app through three milestones on both halves of the
swap-point architecture (local stub ↔ Firebase/Cloud Run transport, selected by
env config).

### Added

**M2 — Server-authoritative conductor** 🟡 _(code complete; cloud deploy pending)_
- `server/conductor/` — singleton Cloud Run service owning
  `/channels/global/state`. Version-guarded RTDB transaction guarantees exactly
  one advance per track boundary even if two instances race.
  → `server/conductor/src/conductor.ts`
- Cloud Scheduler `/tick` watchdog — idempotent recovery that only advances when
  `nextAdvanceAtMs + advanceGraceMs` is genuinely past.
- Pre-hydrated track pool (`/tracks/{id}` incl. `durationMs`) from the Apple
  catalog API (developer token) or iTunes Search (dev). No live catalog call at
  advance time. → `server/conductor/src/pool.ts`
- Presence aggregation into `listenerCount`; `isLive` pause/resume.
- `Dockerfile` + deploy instructions. → `server/conductor/README.md`
- Client-side `FirebaseChannelTransport` — RTDB follows for state/config/tracks,
  `/.info/serverTimeOffset` shared clock, presence with `onDisconnect`.
  → `src/channel/firebaseChannel.ts`

**M3 — Live chat** 🟡 _(client + rules done; Gemini moderation pending)_
- `ChatPanel` — live message list, rate-limited input (1 msg / 2s), 280-char cap,
  `chatEnabled` kill switch, long-press-to-mute. → `src/components/ChatPanel.tsx`
- Firestore transport (`channels/global/messages`, last 50, live) + ambient local
  stub with a simulated crowd reacting to track changes.
  → `src/chat/{chatClient,firestoreChat,stubChat}.ts`

**M4 — Voting loop & leaderboards** 🟡 _(loop + boards + conductor seams live; Apple auth pending)_
- `VoteBar` on the hero — 🔥/💩 with animated tug-of-war tally, one vote per
  track-play. → `src/components/VoteBar.tsx`
- **Boo-to-skip** — a 💩 majority past threshold ends the track early with a
  "booed off the channel" banner (stub conductor + real conductor behind
  `VOTES_ENABLED`).
- **Hype-to-replay** + **cooldowns** in `pickNext` (both conductors).
- Two leaderboards — **Top Slops** (track board by net votes) and **Tastemaker**
  board (early-call credit). → `src/components/LeaderboardPanel.tsx`

**Backend security & config**
- RTDB + Firestore security rules from day one — clients read channel data, write
  only their own user/presence/messages/votes; timeline is conductor-only;
  deterministic vote doc IDs (`<playId>:<uid>`) enforce one-vote-per-play at the
  rules layer. → `firebase/database.rules.json`, `firebase/firestore.rules`
- `.env.example` documenting every activation variable.

### Changed
- `ChannelState` gained `liveFireCount` / `liveSlopCount`; added `trackPlayId()`,
  vote/chat/leaderboard types. → `src/types.ts`
- `channelClient` became a transport switch (stub ↔ Firebase). App shell mounts
  the real chat + leaderboard panels and attaches presence.
- README rewritten for GitHub: what-it-is, zero-config quick start, per-layer
  backend setup, repo layout, roadmap table.

### Removed
- `SideRail` placeholder — superseded by the real `ChatPanel` / `LeaderboardPanel`.

---

## [0.1.0] — 2026-07-04 — M1 Anonymous Shell (on stub channel)

Commit `a1cfecc`. First working app: the M1 anonymous shell rendering against a
stub channel (the M0 carry-over), with the seams for M2+ cut from the start.

### Added

**M1 — Anonymous shell** ✅ _(Firebase Anonymous Auth activates via env)_
- Anonymous-first identity — auto-assigned `adjective-noun-nn` handle + emoji
  avatar, editable, persisted across reloads. Firebase Anonymous Auth + Firestore
  `/users/{uid}` mirror activate via `EXPO_PUBLIC_FIREBASE_*`; built to preserve
  the uid for Sign in with Apple later.
  → `src/identity/{identity,handles}.ts`, `src/components/ProfileEditor.tsx`
- MD-Vinyl Now Playing hero — spinning record, album art, LIVE badge, listener
  count, progress bar. → `src/components/VinylHero.tsx`
- Client follower loop — seek to `serverNow − startedAt`, ±750ms drift correction.
  → `src/hooks/usePlayback.ts`
- `isLive` off-air failsafe state (long-press the LIVE pill to demo).
  → `src/components/OffAirCard.tsx`
- Responsive shell — desktop hero + side rails, mobile/iPad hero-first.
  → `App.tsx`

**M0 seams — MusicKit-in-Expo bridge** 🟡 _(web adapter done; native module pending)_
- `MusicProvider` adapter interface — `authorize`, `search`, `getTrack`, `play`,
  `pause`, `seek`, `getPreviewUrl`, `subscriptionStatus`. → `src/music/MusicProvider.ts`
- MusicKit JS implementation for web. → `src/music/AppleMusicProvider.web.ts`
- Native iOS/iPadOS placeholder (M0 Expo Module). → `src/music/AppleMusicProvider.ts`
- Preview-tier provider — 30s clips looped against the channel clock; permanent
  non-subscriber tier + local dev provider. → `src/music/PreviewMusicProvider.ts`

**Stub conductor** ✅ _(local; replaced by M2 transport when Firebase configured)_
- Client-local loop emitting M2-shaped `ChannelState` (round-robin advance,
  version counter, `nextAdvanceAtMs`), pool hydrated from iTunes Search with a
  bundled fallback. → `src/channel/stubChannel.ts`, `src/channel/channelClient.ts`

**Project foundation**
- Expo + react-native-web scaffold (web + iOS/iPadOS from one codebase).
- `src/theme.ts` — MD-Vinyl visual DNA (warm, tactile, broadcast overlay).
- `docs/ARCHITECTURE.md` — architecture map and milestone seams.

---

## [0.0.0] — 2026-07-03 — Repository initialized

Commit `102a48b`. Empty repo — `.gitignore`, placeholder README.

---

## Not yet started

| Capability | Milestone | Notes |
| --- | --- | --- |
| Native MusicKit Expo Module (iOS/iPadOS auth + playback) | M0 | The #1 technical risk; needs Apple Developer account + Mac/EAS build |
| Sign in with Apple → durable votes/cred | M4 | `linkWithCredential` onto the anonymous uid |
| Gemini-assisted chat moderation + report flow | M3 | Server half of chat |
| Polish & harden: MusicKit recovery UX, trial upsell, analytics | M5 | |
| AI slop made literal: Lyria generation, VJAI host, Veo videos, countdown Show | Phase 2 | All-Google AI stack on Vertex AI |

_Update this file with every capability-affecting change: add an entry under the
current version (or open a new version heading), note the milestone, date, commit,
and the source file(s) that carry the capability._
