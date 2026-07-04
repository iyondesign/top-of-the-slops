# Release Notes & Capability Audit Trail

Every capability TOTS has shipped, when it landed, and where it lives in the
code. This is the durable record — refer here to answer "do we have X yet, and
since when?" The format follows [Keep a Changelog](https://keepachangelog.com);
milestone labels (M0–M5, Phase 2) map to the build sequence in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the product plan §19.

Status legend: ✅ shipped · 🟡 partial (stub/seam in place, backend or native
half pending) · ⚪ not started.

---

## [0.14.0] — 2026-07-04 — Live-radio controls: mute + On Deck room queue

### Added
- **Mute/unmute, not play/pause** — the broadcast never pauses (everyone
  stays in sync); the nav's Tune-in slot becomes a 🔊/🔇 toggle that
  silences YOUR radio while the channel clock keeps running. Wired through
  both providers (`setMuted` on MusicKit volume + preview audio).
- **On Deck** — room-level queue popover from the ☰ button beside Send:
  what the shared pool plays next (same order for every listener — it's
  room state, conductor-derived in M2), NEW badges on tracks contributed
  in the last 5 minutes, and the live-radio caveat that 🔥/💩 can shuffle
  the order.
- **＋ Request a song** in On Deck — opens the library/playlists/search
  picker (AddToPool refactored into a reusable controlled sheet), so any
  listener can call in a request like a radio request line.
- Stub conductor: `getUpNext` (rotation order) + recently-added tracking;
  `channelClient.getUpNext`/`isRecentlyAdded` with the M2 seam noted.

### Versioning
- Manifests bumped to `0.14.0`.

---

## [0.13.0] — 2026-07-04 — Browse your music: Recents · Playlists · A–Z

### Added
- **Recents is the new default** when picking music: `/v1/me/recent/played/
  tracks` (falls back to the A–Z library when empty) — you pick from what
  you actually play, not from an alphabet.
- **Playlists browser**: list your library playlists, drill into one, add
  tracks individually or **＋ Add all** (up to 100) into the shared pool.
- Provider methods `getRecentTracks` / `getUserPlaylists` /
  `getPlaylistTracks` + shared catalog/library song mapper; facade
  wrappers with graceful fallbacks.

### Fixed (in the field, this session)
- MusicKit v3 under Metro web: environment-sniff crashes
  (`process.versions.node`, `Buffer`) resolved by executing the
  self-hosted copy with Node globals shadowed (scoped eval); CDN tag kept
  as fallback. First live Apple Music sign-in + library fetch confirmed
  working end-to-end with a validated developer token.

### Versioning
- Manifests bumped to `0.13.0`.

---

## [0.12.0] — 2026-07-04 — Your Apple Music library, received

### Added
- **`getUserLibrary`** on the Apple provider: after Connect Apple Music,
  the Music-User-Token pulls the signed-in user's library songs
  (`/v1/me/library/songs`, catalog ids preferred so channel playback works
  everywhere). Exposed via `fetchUserLibrary()`.
- **"From your Apple Music library"** section in Feed the channel — loads
  automatically once connected; every library song has an ＋ Add into the
  shared pool. The visible proof that auth received your music details.

### Changed
- `isAppleConfigured` now requires a real JWT (`eyJ…`) — placeholder values
  left in `.env` no longer count as configured.
- Stub pool clamps imported full-length durations to the 30s preview
  boundary so the demo room keeps rotating.

### Versioning
- Manifests bumped to `0.12.0`.

---

## [0.11.0] — 2026-07-04 — Wired to the real Firebase project

### Changed
- **`top-of-the-slops` Firebase web config committed as defaults** in
  `src/firebase.ts` (client config is public by design; env vars still
  override per-environment). Identity now attempts real Firebase Anonymous
  Auth on every start.
- **Two-stage activation:** identity/auth go live off console toggles
  alone, but the live room (RTDB channel + Firestore chat + presence +
  votes) is now gated behind `EXPO_PUBLIC_LIVE_CHANNEL=1` — flip it only
  after the conductor is deployed, so the hero never hangs on a timeline
  nothing writes. (`isLiveBackend()` replaces `isFirebaseConfigured()` for
  transport selection.)
- **Identity hardened**: Firebase auth or Firestore failures (provider not
  yet enabled, network block, unprovisioned DB) fall back to the local
  profile with a console warning — the app never blocks on backend state.
  Verified: real config + blocked network → clean fallback, app fully live.
- `docs/SETUP-TODO.md` updated to the remaining console checklist;
  `.env.example` documents the committed defaults + live-channel flag.

### Versioning
- Manifests bumped to `0.11.0`.

---

## [0.10.0] — 2026-07-04 — Progressive auth: iCloud / Google / email on Firebase

### Added
- **"Keep your cred"** in the profile sheet: attach a real identity to the
  anonymous session — **Sign in with Apple (iCloud)**, **Google**, or a
  **direct email/password account** — all on Firebase Auth (Google
  infrastructure). Credentials are **linked onto the anonymous uid**
  (`linkWith*`) so votes, handle, and tastemaker score survive; if the
  identity already owns an account, we sign into it and the profile follows
  (credential-already-in-use fallback). Web popup flows now; native arrives
  with the M0 dev build. Graceful "not configured" state until the Firebase
  project is wired. → `src/identity/authProviders.ts`,
  `useIdentity().link`, `ProfileEditor`
- **`docs/SETUP-TODO.md`** — the two pending credentials (Apple developer
  token ⏳ account pending; Firebase web config ⏳), exact setup steps, and
  the security ground rules (web config is shareable; service-account JSON,
  `.p8` keys, and Gemini keys are never pasted in chat / committed).
- **`scripts/mint-apple-developer-token.mjs`** — zero-dependency ES256 JWT
  minting from the MusicKit `.p8` (key never leaves your machine).

### Versioning
- Manifests bumped to `0.10.0`.

---

## [0.9.0] — 2026-07-04 — Connect Apple Music + feed the pool

### Added
- **Apple Music connect flow** (wired now, activates with a token): shared
  music-provider singleton (`getMusicMachine`) driven by both playback and
  the connect UI; `useMusicAuth` hook tracking `unconfigured/preview/
  subscriber` and calling MusicKit `authorize()`. With
  `EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN` set, the Connect button runs the real
  Apple sign-in; without it, a graceful "not configured yet" state.
  → `src/hooks/useMusicAuth.ts`, `src/music/index.ts`
- **Feed the channel** — `AddToPool` modal (＋ Add a banger in the nav /
  below the hero on mobile): catalog search (`searchCatalog` — public
  iTunes now, Apple provider when configured) that adds favorites to the
  **shared candidate pool** the conductor plays for everyone. Stays on the
  communal-channel concept; not a private playlist.
  → `src/components/AddToPool.tsx`, `channelClient.addToPool`,
  `stubChannel.addToPool`
- Design-system `feed-the-channel.html` card; README "Feeding the channel"
  section.

### Changed
- `usePlayback` now uses the shared provider singleton (no longer creates
  or destroys its own), so auth state is shared with the connect flow.

### Versioning
- Manifests bumped to `0.9.0`.

---

## [0.8.4] — 2026-07-04 — Remove the rotating gloss sheen

### Changed
- Dropped the disc gloss sheen added in 0.8.3. The record still spins with
  momentum and an asymmetric label. → `src/components/VinylHero.tsx`

### Versioning
- Manifests bumped to `0.8.4`.

---

## [0.8.3] — 2026-07-04 — The record spins like a record

### Changed
- Vinyl rotation reworked with **momentum**: accumulating-angle spin so the
  platter **spins up** (ease-in from rest) when playback starts and
  **coasts to a stop** (ease-out) when it pauses, instead of snapping on/off.
- Added an **asymmetric label** (dominant-tint smear + artist initial) for
  artwork-less tracks — so the spin reads clearly even before real album
  art loads. Real artwork rotates as the label, as it always did.
  → `src/components/VinylHero.tsx`

### Versioning
- Manifests bumped to `0.8.3`.

---

## [0.8.2] — 2026-07-04 — ON AIR moves to the nav

### Changed
- **ON AIR badge moved from the hero into the global nav**, right of the
  logo (new `OnAirBadge` component — keeps the pulsing lamp + long-press
  off-air toggle; shows only while `isLive`). The hero now opens straight
  on the record.
- **Removed the `TOTS•01` nav badge** (the channel bug still rides the
  smart bar's telemetry row).
- Design-system chrome card updated to the new nav lockup.

---

## [0.8.1] — 2026-07-04 — The contested seam

### Added
- When **both camps have votes**, the smart bar's crossover grows a
  contested seam: a 3px breathing sliver of white light (1.1s pulse, glow
  in the fire↔slop midpoint color) that slides on a spring as the vote
  split shifts — the fight, visible. → `Waveform` `contested` prop, wired
  from `VotePlaybackBar`; design-system hero card + DESIGN.md updated.

---

## [0.8.0] — 2026-07-04 — VotePlaybackBar: playback + votes as one smart line

### Added
- **`VotePlaybackBar`** — the smart bar fusing progress and the vote
  tug-of-war: 🔥 pill anchors the waveform's left end, 💩 the right; lit
  length = playback progress, and within it the fire gradient floods from
  the left while slop floods from the right — **the crossover is the vote
  split**. Spectrum coloring until the first vote lands. One telemetry row
  underneath (timecode · vote hint · channel bug). Replaces the separate
  progress + vote rows. → `src/components/VotePlaybackBar.tsx`

### Changed
- Hero: track title + artist collapsed to one line ("Title · Artist");
  needle-drop, glow tint, and booed-off banner unchanged.
- **Tune In moved to the global nav**, left of the profile chip — compact
  coral pill; the stage keeps zero chrome.
- `Waveform` gained `fireShare`/`hasVotes` for tug coloring; design-system
  hero card + DESIGN.md updated to the smart bar.

### Removed
- `VoteBar.tsx` (absorbed into `VotePlaybackBar`).

---

## [0.7.1] — 2026-07-04 — Room header: one line

### Changed
- Merged the panel title into the tabs: the chat tab is now **"The Room"**
  (no separate title), so the tabs read The Room / Top Slops / Tastemakers.
- Presence dropped the "IN THE ROOM" text — now just a live dot + count —
  and moved onto the tab line, right-aligned. Whole header is one row.

---

## [0.7.0] — 2026-07-04 — The Room: one consolidated social panel

Layout consolidation per the VyRT artist-view reference: a dominant artist
stage with a single self-contained social column beside it.

### Added
- **`RoomPanel`** — Chat, Top Slops, and Tastemakers behind tabs in ONE
  glass panel; **presence ("N IN THE ROOM" + live dot) lives in the panel
  header**, tied to the room itself. → `src/components/RoomPanel.tsx`

### Changed
- Desktop layout: two rails → **hero + one Room rail (360px)**; hero grew
  to 440–460px and the stage now dominates the viewport. Mobile: hero-first
  with the Room below.
- Hero badge row simplified to the ON AIR lamp only (listener pill moved
  into the Room header).
- Design system: `room-panel.html` card replaces the separate chat +
  leaderboard cards; layout principle documented in `docs/DESIGN.md`.

### Removed
- `ChatPanel.tsx`, `LeaderboardPanel.tsx` (absorbed into `RoomPanel`);
  `design-system/components/{chat,leaderboard}.html`.

### Versioning
- Manifests bumped to `0.7.0`.

---

## [0.6.1] — 2026-07-04 — Header uses the real brand mark

### Changed
- Header lockup now renders the actual icon artwork (`assets/logo-mark.png`,
  rendered from `design-system/brand/mark.svg` — same art as the app icon)
  via `Animated.Image` instead of a View-built approximation; still spins
  lazily. Favicon verified served correctly (Expo converts the PNG to .ico
  on the fly; browsers need a hard refresh to drop their favicon cache).

---

## [0.6.0] — 2026-07-04 — Brand: logo, Space type family, per-track lighting

### Added
- **The TOTS mark** — "the record wearing its spectrum": vinyl disc, ¾
  spectrum ring (the live waveform), coral label (the signal), gap = the room.
  Animated lockup in the top bar (lazy 8s spin), SVG source of truth, and
  regenerated `assets/` app icon / splash icon / favicon rendered from it.
  → `src/components/Logo.tsx`, `design-system/brand/`
- **Real typography** — Space Grotesk (display: titles, wordmark, headers,
  tabs, buttons) + Space Mono (telemetry) loaded via expo-font; utility text
  stays on the native system stack. → theme `fonts`, applied across components
- **Per-track lighting** — `useArtworkTint` extracts the dominant vibrant
  color from the current artwork (web canvas sampling; coral fallback) and
  re-lights the hero glow + spindle on every track change.
  → `src/hooks/useArtworkTint.ts`

### Versioning
- Manifests bumped to `0.6.0`.

---

## [0.5.0] — 2026-07-04 — Ambient artwork backdrop + frosted glass surfaces

### Added
- **Ambient backdrop** — the current track's artwork scaled 1.25×, blurred
  (radius 70), crossfaded on track change, blended under a `rgba(10,10,12,.74)`
  scrim so the artist's colors tint the whole viewport without competing with
  content (QENARA-style player backdrop). Artwork-less tracks fall back to
  three soft spectrum fields. → `src/components/AmbientBackdrop.tsx`
- **Frosted glass surfaces** — `GlassPanel` primitive + `glassFill` /
  `glassBorder` / `GLASS_BLUR` tokens: `rgba(19,19,24,.55)` fill with
  `backdrop-filter: blur(24px) saturate(160%)`; applied to the chat rail,
  leaderboards, telemetry pill, and profile chip. Native gets expo-blur with
  the M0 dev build. → `src/ui/GlassPanel.tsx`
- Design system: new `foundations/glass.html` card (glass spec over ambient
  demo); chat + leaderboard cards retrofitted with glass and ambience;
  surfaces section in `docs/DESIGN.md`.

### Versioning
- Manifests bumped to `0.5.0`.

---

## [0.4.0] — 2026-07-04 — "Signal" design language v2 + motion system

Premium-modern redesign pass against the product owner's reference set
(Beat, Muzaic screenshots).

### Added
- **Motion primitives** — `PressableScale` (spring press physics, →0.95, on
  every touchable) and `Waveform` (27-bar animated live waveform; played bars
  lit in spectrum color, doubles as the progress element).
  → `src/ui/PressableScale.tsx`, `src/components/Waveform.tsx`
- **Interaction states** — needle-drop track entrance (0.94→1 spring + fade),
  glowing coral CTA, chat message entrances (fade + rise), vote pop retained.
- **The spectrum** — `#3D8BFF→#B265FF→#FF4FD8→#FF7A3D`, sampled per-element
  via `samplePalette()` (no gradient dependency); reserved exclusively for
  live music energy (waveform, gradient vote tug).

### Changed
- **Palette v2:** warm brown-black/gold/phosphor → neutral rich black
  (`#0A0A0C`), single coral signal (`#FF4655` = action + on-air),
  fire `#FF7A3D` / slop `#B265FF`, neutral `telemetry` gray replaces
  phosphor green. Type: sentence-case 800 display (caps now reserved for
  telemetry), light 300 prompt register added.
- Design-system cards + `docs/DESIGN.md` regenerated as **Signal v2**;
  chat handles quieted to neutral (signal color reserved for self + actions).

### Versioning
- Manifests bumped to `0.4.0`.

---

## [0.3.0] — 2026-07-04 — "Broadcast Vinyl" design system

### Added
- **The TOTS design language** — fuses the contemporary dark music-app school
  (Dribbble reference set: near-black canvas, single electric accent, oversized
  display type, pill controls, artwork glow) with TOTS's MD-Vinyl/broadcast DNA.
  Unique signature: the app is a TV station — ON AIR tally lamp, phosphor-green
  mono telemetry (timecode, listener count, sync), TOTS•01 channel bug, 🔥/💩
  two-tone vote duality. Rationale + full spec → `docs/DESIGN.md`
- **Design-system preview bundle** in Claude Design (DesignSync) format — 8
  self-contained rendered cards with `@dsCard` markers: colors, type,
  geometry/motion foundations; vinyl hero, vote, chat, leaderboard, chrome
  components. Ready to sync to a claude.ai/design project from any
  design-authorized session. → `design-system/`
- Motion + mono-font tokens (`motion`, `fonts`) in the theme.

### Changed
- `src/theme.ts` retuned to the Broadcast Vinyl palette (warm black `#0D0B09`,
  gold `#F5A623`, ON AIR red `#FF3B30`, fire `#FF6B2C`, slop `#9D6BFF`, new
  phosphor `#35E08A` for live telemetry).
- Hero: LIVE pill → pulsing **ON AIR** lamp; listener pill → phosphor telemetry;
  artwork glow behind the record; mono timecode + channel bug under the
  progress bar; display-weight uppercase titles. Top bar gained the TOTS•01
  bug; chat header meta now phosphor `LIVE CHAT`. → `src/components/`, `App.tsx`

### Versioning
- Manifests bumped to `0.3.0`.

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

### Versioning
- Aligned all manifests to `0.2.0` (`package.json` had carried the scaffold
  default `1.0.0`; `app.json` and `server/conductor/package.json` moved up from
  `0.1.0`). Version numbers now track this changelog.

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
