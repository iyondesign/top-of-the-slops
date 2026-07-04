# Signal — the TOTS design language (v2)

The design system lives in [`design-system/`](../design-system/) as rendered
preview cards (DesignSync format) and is applied in code via
[`src/theme.ts`](../src/theme.ts). This doc is the why and the rules.

## Lineage

v1 ("Broadcast Vinyl") fused the dark music-app genre with TOTS's MD-Vinyl +
broadcast DNA. v2 is the **premium-modern pass** against a concrete reference
set supplied by the product owner (Beat; Muzaic):

- **From Beat:** neutral rich black (cool, not warm), ONE coral-red signal
  color doing all the talking, SF-grade grotesque with sentence-case bold
  headers, circular controls, red pill CTAs. Restraint as luxury.
- **From Muzaic:** the canvas stays colorless so a single
  **spectrum gradient** (blue→violet→pink→orange) can carry all the emotion —
  waveform lines, mood blobs, generative art. Huge light-weight prompt type.
  Emptiness as confidence.
- **Kept from TOTS v1 (the part no reference has):** the app is a TV
  station — ON AIR tally lamp, mono telemetry, TOTS•01 channel bug, the 🔥/💩
  duality, and the spinning vinyl itself.

## Principles

1. **Artwork is the sun.** The vinyl hero is the largest thing on any screen;
   a soft signal glow is the room's lighting. Everything else is matte.
2. **One voice per color.** Coral = action + on-air (the single signal).
   Orange = 🔥. Violet = 💩. Neutral mono = telemetry. **The spectrum sings** —
   and only sings: it appears exclusively where live music energy is
   (waveform, vote tug, generative art), never as chrome.
3. **Broadcast, not dashboard.** `ON AIR`, `26 IN THE ROOM`, `00:14 / 00:30`,
   `TOTS•01` — control-room voice in quiet neutral mono, humming under big
   human type.
4. **Tactile or nothing.** Every touchable presses down (spring to 0.95).
   Votes pop. Tracks needle-drop in. The record spins at 33⅓. Nothing
   interactive is allowed to feel inert.
5. **The crowd is visible.** Presence, tallies, message entrances — ambient
   life, not widgets.

## Tokens

### Color

| Token | Value | Job |
| --- | --- | --- |
| `bg` | `#0A0A0C` | canvas — neutral rich black, never `#000` |
| `bgRaised` | `#131318` | cards, rails |
| `bgSunken` | `#050507` | wells, inputs, vinyl label |
| `border` | `rgba(255,255,255,.07)` | hairlines (`borderStrong` `.14` for focus) |
| `text` | `#F7F7F8` | primary ink |
| `textDim` / `textFaint` | `#A0A0AA` / `#62626C` | secondary / tertiary |
| `accent` = `live` | `#FF4655` | **the** signal: primary action AND on-air |
| `fire` | `#FF7A3D` | 🔥 banger side |
| `slop` | `#B265FF` | 💩 slop side |
| `telemetry` | `#9A9AA3` | live readouts — quiet, never glowing |
| `vinyl` / groove | `#0E0E12` / `#202028` | the record |

**The spectrum** `#3D8BFF → #B265FF → #FF4FD8 → #FF7A3D` — sampled per-element
via `samplePalette()` (no gradient dependency). Reserved for live music
energy. Gradient pairs: `gradients.fire` `#FFB13D→#FF5E3A`, `gradients.slop`
`#8B5CF6→#FF4FD8` (the vote tug's two ends).

Elevation is light, not darkness: signal-colored glows (coral CTA bloom,
artwork halo), never black drop-shadows.

### Type

Three voices, loaded via expo-font (`fonts` in theme.ts):

| Voice | Face | Use |
| --- | --- | --- |
| Display | **Space Grotesk** Bold / Medium | track titles, wordmark, panel headers, tabs, buttons — the brand speaks |
| Telemetry | **Space Mono** | every live number: timecode, counts, channel bug — the siblings share one story |
| Utility | native system stack (SF on Apple) | chat, body copy, meta — the OS handles the plumbing |

| Role | Spec |
| --- | --- |
| Display | Space Grotesk Bold, sentence case, tracking −2%, leading 1.02 |
| Prompt | 300 weight system, 26px, dim — empty states, onboarding |
| Body / caption | system 400/600 · 15px / 12px |
| Telemetry | Space Mono, 11px, uppercase, +8% tracking, `telemetry` gray |

No all-caps display type — caps are reserved for telemetry.

### Geometry

Radii: pills `999`, cards `24`, tiles `12`. Space: `4·8·12·16·24·32·48`.
Cards: 1px `border` + 4% white top-edge inner highlight. Layout (VyRT
lesson): the artist visual dominates — desktop = big hero + ONE Room rail
(The Room / Top Slops / Tastemakers behind tabs, with the presence count —
just a live dot + number — right-aligned on the tab line); <1024px
hero-first with the Room below. One social surface, everything else is stage.

### Surfaces: ambient backdrop + frosted glass

Two layers define depth in v2 (see `design-system/foundations/glass.html`):

- **Ambient backdrop** (`src/components/AmbientBackdrop.tsx`): the current
  track's artwork, scaled 1.25×, blurred (radius 70), crossfaded on track
  change, under a `rgba(10,10,12,.74)` scrim — the artist's colors tint the
  whole viewport without ever competing with content in front. Tracks with no
  artwork fall back to three soft spectrum fields, so the room is never flat
  black.
- **Frosted glass** (`src/ui/GlassPanel.tsx`, tokens `glassFill` /
  `glassBorder` / `GLASS_BLUR`): fill `rgba(19,19,24,.55)`,
  `backdrop-filter: blur(24px) saturate(160%)`, hairline `rgba(255,255,255,.09)`
  border, radius 24. Applied to the chat rail, leaderboards, telemetry pills,
  and the profile chip — everything behind glass reads as soft blurred color.
  Web ships real backdrop-filter; native gets expo-blur with the M0 dev build
  (translucent fill until then).

Opaque `bgRaised` remains for surfaces that sit on other surfaces (modal
sheets, wells) — glass is for panels floating over the ambience.

### Motion

| Token | Spec | Use |
| --- | --- | --- |
| `pressScale` | spring → 0.95, back on release | every touchable (`PressableScale`) |
| `rpm33` | 1800ms linear ∞ | vinyl spin |
| `needleDrop` | 0.94→1 spring + fade, ~400ms | track-change entrance |
| `votePop` | spring 1→1.35→1 | 🔥/💩 press |
| `onAirPulse` | 2s ease ∞ | ON AIR lamp |
| waveform | staggered per-bar height loops, 260–600ms | the live progress element |
| message enter | 220ms fade + 6px rise | chat |

Reduced motion: spin pauses, springs become fades, waveform freezes at
mid-height.

### The smart bar (VotePlaybackBar)

The signature element (`src/components/VotePlaybackBar.tsx` +
`Waveform.tsx`): playback and the vote tug fused into ONE line. The 🔥 pill
anchors the waveform's left end, 💩 anchors the right; 27 bars animate their
heights while the channel plays. **Lit length = playback progress; within
the lit region the fire gradient floods from the left and slop from the
right — the crossover is the vote split.** Before any votes land, the lit
region sings in spectrum color. Underneath, one telemetry row: timecode ·
vote hint (ONE CALL PER PLAY / BANGER, CALLED) · channel bug. The Tune In
CTA lives in the global nav (left of the profile chip), keeping the stage
clear.

## Brand

**The mark: the record wearing its spectrum** (`design-system/brand/` — SVG
source + rendered app icons in `assets/`). One glyph, whole product: the
record is the music, the ¾ spectrum ring is the live waveform/progress, the
coral label is the signal, and the gap in the ring is the room. Rules: never
recolor the ring; clear space = one label-radius; the mark spins (8s, lazy)
only where the channel is live (`src/components/Logo.tsx`). Lockup: mark +
"TOTS" in Space Grotesk Bold; the full "Top of the Slops" name lives in copy,
not chrome.

**Per-track lighting:** `useArtworkTint` extracts the artwork's dominant
vibrant color (canvas sampling on web; native lands with the M0 dev build)
and re-lights the hero glow + spindle every track — the room belongs to
whoever's playing. Falls back to coral when artwork is missing or gray.

## Voice

Playful, irreverent, pirate-TV: "booed off the channel", "warming up the
decks". Chrome copy is telemetry-terse; human copy is lowercase and warm.
Emoji are functional vocabulary (🔥/💩), never decoration.

## Syncing to Claude Design

`design-system/` cards are self-contained with `@dsCard` markers — DesignSync
format. From a design-authorized session (desktop `/design-login`, or Claude
Design → "Send to Claude Code Web"), sync the directory to a design-system
project; iterate visually there; bring decisions back token-first through
`src/theme.ts`.
