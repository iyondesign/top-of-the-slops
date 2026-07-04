# Top of the Slops (TOTS)

**Appointment-based, communal music discovery — MTV TRL / Top of the Pops for an AI world.**

One always-on live channel everyone tunes into together: the same track at the same
moment, a live room, and 🔥/💩 votes that crown bangers and boo off slop. "Slop" is a
badge, not an insult.

## Status

Kickoff scaffold: the **M1 anonymous shell** running against a **stub channel**
(the M0 carry-over), with the seams for M2+ already in place.

| Milestone | Scope | Status |
| --- | --- | --- |
| M0 | De-risk the MusicKit-in-Expo bridge (native module + MusicKit JS behind `MusicProvider`) | 🟡 web adapter scaffolded; native module pending |
| M1 | Anonymous shell: instant identity, MD-Vinyl hero, responsive layouts, off-air failsafe | 🟡 built on stub state; Firebase Anonymous Auth activates via env config |
| M2 | Firebase-backed conductor: server-authoritative channel on RTDB, Cloud Run singleton, presence | ⚪ seams in place (`channelClient.ts` is the swap point) |
| M3 | Discord-style chat + moderation + kill switch | ⚪ rail placeholder |
| M4 | Sign in with Apple, 🔥/💩 voting, crowd-influenced queue, leaderboards | ⚪ rail placeholder |
| M5 | Polish + harden | ⚪ |

## Run it

```bash
npm install
npm run web      # web (desktop + mobile responsive)
npm run ios      # requires an Expo development build — NOT Expo Go (MusicKit needs custom native code)
```

With no configuration, the app runs fully local: a stub conductor rotates a
track pool hydrated from the public iTunes Search API (30s previews, real
artwork), identity is a locally persisted anonymous handle, and the hero,
sync loop, and off-air failsafe all work. Long-press the **LIVE** pill to flip
the channel off air (dev failsafe demo); long-press the off-air card to resume.

## Configuration (activates the real backends)

Set via `.env` / `EXPO_PUBLIC_*` env vars:

| Variable | Unlocks |
| --- | --- |
| `EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN` | MusicKit (full-catalog playback for subscribers; MusicKit JS on web) |
| `EXPO_PUBLIC_FIREBASE_API_KEY`, `..._PROJECT_ID`, `..._APP_ID`, `..._AUTH_DOMAIN`, `..._DATABASE_URL`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID` | Firebase Anonymous Auth + Firestore `/users/{uid}` (M1), RTDB channel state (M2) |

## Architecture in one breath

You cannot rebroadcast a stream: "listening together" means every subscriber
independently plays the same track and seeks to the same timestamp,
coordinated by a backend **conductor of state, never an audio server**. All
music-service calls sit behind one `MusicProvider` adapter (Apple Music is
the only MVP implementation; Spotify is parked). See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layout, data model, and
milestone seams.
