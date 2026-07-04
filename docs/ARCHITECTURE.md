# TOTS Architecture

Condensed from the product plan (v2.1) and the M1/M2 fable spec. This file is
the working map; the source documents win on any conflict.

## The one constraint that shapes everything

No music API allows rebroadcasting one person's audio to a room (licensing,
not technology). So "listening together" is: a backend **conductor** owns one
authoritative `ChannelState` (`currentTrackId`, `startedAtServerMs`,
`isPlaying`, …); every subscriber's client independently loads that track,
seeks to `serverNow() − startedAtServerMs`, plays, and drift-corrects if off
by more than ±750 ms. Non-subscribers hear the 30s preview for the same
track. The backend never touches audio.

## Stack

- **Client:** Expo (React Native) + `react-native-web` → iOS/iPadOS + web
  from one codebase. Requires an Expo **development build** (not Expo Go) once
  the native MusicKit module lands.
- **Music:** everything behind the `MusicProvider` interface
  (`src/music/MusicProvider.ts`): `authorize`, `search`, `getTrack`, `play`,
  `pause`, `seek`, `getPreviewUrl`, `subscriptionStatus`.
  - Web: MusicKit JS (`AppleMusicProvider.web.ts`).
  - iOS/iPadOS: custom Expo Module wrapping MusicKit (M0 deliverable;
    `AppleMusicProvider.ts` is the placeholder).
  - Preview tier + local dev: `PreviewMusicProvider` (30s clips looped
    against the channel clock; silent clock on native until M0).
- **Realtime + backend (M2+):** Firebase — RTDB for fast-changing channel
  state + presence (gives `onDisconnect` + `/.info/serverTimeOffset`),
  Firestore for durable data (users; later votes/leaderboards), the conductor
  as a singleton Cloud Run service, Cloud Scheduler as its watchdog.
- **AI layer (Phase 1.5+, Google-native):** Gemini (moderation, later VJAI +
  recaps), Imagen (vinyl-label art), Chirp (VJAI voice), Veo (pre-rendered
  music videos), Lyria (Phase-2 AI music generation).

## Client layout

```
App.tsx                      shell: responsive layout (desktop rails / mobile hero-first)
src/
  types.ts                   domain types — mirror the M2 RTDB/Firestore shapes
  theme.ts                   MD-Vinyl visual DNA (warm, tactile, broadcast overlay)
  firebase.ts                optional Firebase bootstrap (env-gated; app runs local-only without it)
  music/                     MusicProvider adapter + implementations
  channel/
    stubChannel.ts           M1 stub conductor (client-local, M2-shaped state)
    channelClient.ts         THE SWAP POINT: subscribe{ChannelState,AppConfig}, serverNow()
  identity/                  anonymous-first identity (adjective-noun-nn handles, avatars)
  hooks/                     useChannel*, useIdentity, usePlayback (follower loop)
  components/                VinylHero, OffAirCard, ProfileEditor, SideRail placeholders
```

## Milestone seams (where the next work plugs in)

- **M0 (native bridge):** implement the Expo Module behind
  `src/music/AppleMusicProvider.ts`; nothing else changes.
- **M2 (real conductor):** reimplement `src/channel/channelClient.ts` over
  RTDB (`/channels/global/state`, `/app/config`,
  `/.info/serverTimeOffset` for `serverNow()`); delete `stubChannel.ts`. The
  Cloud Run conductor + Scheduler watchdog live in a new `server/` workspace.
  The stub already emits M2-shaped `ChannelState` (including `version` and
  `nextAdvanceAtMs`) so UI code won't move.
- **M3 (chat):** replaces the chat `SideRail` placeholder; messages in
  Firestore, presence already on RTDB. `chatEnabled` kill switch is already
  in `AppConfig`.
- **M4 (auth + voting):** Sign in with Apple via `linkWithCredential` on the
  anonymous uid (identity is built to preserve uid); vote hooks feed the
  conductor's `pickNext` / early-skip seams; leaderboards replace the second
  rail.

## Data model (target, M2+)

RTDB (fast-changing, conductor-written):

```
/app/config                        { isLive, chatEnabled }
/channels/global/meta              { title, poolTrackIds, cooldownMs, advanceGraceMs }
/channels/global/state             { currentTrackId, startedAtServerMs, durationMs,
                                     isPlaying, version, nextAdvanceAtMs, listenerCount }
/channels/global/recentPlays/{id}  lastPlayedAtMs
/tracks/{trackId}                  { title, artist, artworkUrl, previewUrl, durationMs }
/presence/{uid}                    { online, lastSeen }
```

Firestore (durable/queryable): `/users/{uid}` now; votes, trackPlays,
leaderboard entries in M4.

Security rules from day one: clients read channel state/config, write only
their own `/users/{uid}` and `/presence/{uid}`; the channel timeline is
written **only** by the conductor (Admin SDK).

## Guardrails (inherited lessons — override feature enthusiasm)

1. Community before events: the always-on channel must be alive on its own;
   the countdown show is a later peak, never the center.
2. Focus beats breadth: no NFTs, no VR/AR, no mid-song ads, no DMs/friends
   graph, no user-created rooms, no Spotify at launch.
3. Low-friction entry, earned depth: anonymous-first, progressive auth.
4. In the MVP, "slop" is pure playful branding on the Apple Music catalog —
   no AI-generated music until Phase 2 (Lyria et al.).
