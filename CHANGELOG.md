# Release Notes & Capability Audit Trail

Every capability TOTS has shipped, when it landed, and where it lives in the
code. This is the durable record — refer here to answer "do we have X yet, and
since when?" The format follows [Keep a Changelog](https://keepachangelog.com);
milestone labels (M0–M5, Phase 2) map to the build sequence in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the product plan §19.

Status legend: ✅ shipped · 🟡 partial (stub/seam in place, backend or native
half pending) · ⚪ not started.

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
