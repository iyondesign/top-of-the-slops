# Broadcast Vinyl — the TOTS design language

The design system lives in [`design-system/`](../design-system/) as rendered
preview cards (DesignSync format) and is applied in code via
[`src/theme.ts`](../src/theme.ts). This doc is the why and the rules.

## Lineage

Two bloodlines, deliberately fused:

1. **The contemporary dark music-app school** (the Dribbble reference set —
   QENARA / Orizon-style luxury dark UI, bento music dashboards): near-black
   canvas, ONE electric accent doing all the talking, oversized ultra-heavy
   display type, pill-shaped controls, big-radius cards, chromatic glow bleeding
   out from artwork, generous negative space.
2. **TOTS's own DNA** (product plan §2/§15, non-negotiable): MD-Vinyl warmth —
   oversized album art, spinning record, tactile and nostalgic — wrapped in a
   live *broadcast channel* overlay. MTV/TRL, not a streaming library.

What makes it unique — the part no reference shot has: **the app is a TV
station.** Chrome speaks broadcast: an ON AIR tally lamp, phosphor-green
timecode and telemetry in monospace, a channel bug (TOTS•01), and the 🔥/💩
vote duality as a two-tone tug-of-war. Dark-luxury restraint from the genre;
warmth and crowd-noise from TOTS.

## Principles

1. **Artwork is the sun.** The vinyl hero is the largest thing on any screen;
   its glow is the room's lighting. Everything else is matte and recedes.
2. **One voice per color.** Gold = brand/action. Red = ON AIR. Orange = 🔥.
   Violet = 💩. Phosphor green = live telemetry (counts, clocks, sync). Never
   borrow a color for a second job.
3. **Broadcast, not dashboard.** Labels read like a control room: `ON AIR`,
   `26 IN THE ROOM`, `00:14 / 00:30`, `TOTS•01`. Micro-type is uppercase,
   letterspaced, mono where it's live data.
4. **Tactile or nothing.** Anything interactive moves like an object: votes
   pop, the record spins at 33⅓, track changes drop the needle. No fades where
   a spring belongs.
5. **The crowd is visible.** Presence, tallies, and flair are ambient light,
   not widgets — a quiet room should still look inhabited.

## Tokens

### Color

| Token | Value | Job |
| --- | --- | --- |
| `bg` | `#0D0B09` | canvas — warm black, never pure #000 |
| `bgRaised` | `#17130F` | cards, rails |
| `bgSunken` | `#070605` | wells, inputs, vinyl label |
| `border` | `#2B241D` | 1px hairlines |
| `text` | `#F6EFE3` | primary ink (cream, not white) |
| `textDim` | `#AFA28D` | secondary |
| `textFaint` | `#6E6355` | tertiary/labels |
| `gold` | `#F5A623` | brand, primary action, focus ring |
| `goldSoft` | `rgba(245,166,35,.14)` | selected/soft fills |
| `onAir` | `#FF3B30` | LIVE lamp + off-air messaging only |
| `fire` | `#FF6B2C` | 🔥 banger side |
| `slop` | `#9D6BFF` | 💩 slop side |
| `phosphor` | `#35E08A` | live telemetry: timecode, listener count, sync |
| `vinyl` | `#0A0908` / groove `#221C16` | the record |

Artwork glow: a large-radius blur of the dominant artwork color at ~35%
opacity behind the record (fallback: gold). This is the only "shadow" in the
system — elevation is light, not darkness.

### Type

| Role | Spec | Use |
| --- | --- | --- |
| Display | 900 weight, uppercase, tracking −1%, leading 0.95 | track titles, OFF AIR |
| Title | 800, sentence case | panel headers, artist |
| Body | 400/600, 15px | chat, copy |
| Caption | 600, 12px | handles, meta |
| Telemetry | mono stack (`SF Mono`/`JetBrains Mono`/monospace), 11–12px, uppercase, tracking +8%, phosphor | timecode, counts, channel bug |

### Geometry & space

Radii: pills `999`, cards `24`, artwork tiles `16`, inner tiles `12`.
Space scale: `4 · 8 · 12 · 16 · 24 · 32 · 48`. Desktop = rails + hero
(chat left, boards right); <1024px = hero-first stack. Cards get a 1px
`border` + a 4% cream top-edge highlight for the tactile lip.

### Motion

| Token | Spec | Use |
| --- | --- | --- |
| `rpm33` | 1800ms linear ∞ | vinyl spin (≈33⅓ rpm) |
| `needleDrop` | 400ms cubic-bezier(.2,.8,.2,1) | track change enter |
| `votePop` | spring, ~300ms, 1→1.35→1 | 🔥/💩 press |
| `tallyShift` | 250ms ease-out | tug-of-war bar |
| `onAirPulse` | 2s ease ∞, opacity .6↔1 | LIVE lamp dot |

Respect reduced-motion: spin pauses, springs become fades.

## Voice

Playful, irreverent, a little pirate-TV: "booed off the channel", "warming up
the decks", "slop identity". Chrome copy is broadcast-terse and uppercase;
chat-adjacent copy is lowercase and human. Emoji are functional vocabulary
(🔥/💩), never decoration soup.

## Syncing to Claude Design

`design-system/` cards each start with an `@dsCard` marker and are fully
self-contained (inline CSS, no external requests) — the format Claude
Design's DesignSync consumes. From a design-authorized session
(`/design-login` in desktop Claude Code, or seed via Claude Design → "Send to
Claude Code Web"), sync with: *"sync design-system/ to my TOTS Design System
project"*. Iterate visually there; changes come back token-first through
`src/theme.ts`.
