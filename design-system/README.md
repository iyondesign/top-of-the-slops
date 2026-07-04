# TOTS Design System — "Broadcast Vinyl"

Rendered preview cards for the TOTS design language. Each `.html` file is
fully self-contained (inline CSS, no external requests) and starts with an
`@dsCard` marker — the format Claude Design's DesignSync consumes.

- Rationale + full token spec: [`../docs/DESIGN.md`](../docs/DESIGN.md)
- Applied in code: [`../src/theme.ts`](../src/theme.ts) (single source of
  styling truth — code generation should read tokens from there, and visual
  intent from these cards)

## Cards

| File | Group | Shows |
| --- | --- | --- |
| `foundations/colors.html` | Colors | palette, one-voice-per-color rule |
| `foundations/type.html` | Type | display→telemetry scale |
| `foundations/geometry-motion.html` | Foundations | radii, spacing, live motion tokens |
| `components/vinyl-hero.html` | Components | the Now Playing hero, assembled |
| `components/vote.html` | Components | vote pill states, tally, boo banner |
| `components/room-panel.html` | Components | The Room — chat + boards tabs, presence in header |
| `components/chrome.html` | Components | wordmark, buttons, pills, off-air |
| `foundations/glass.html` | Foundations | frosted glass + ambient backdrop spec |
| `brand/logo.html` | Brand | the mark, lockup, app icon, usage rules |

## Syncing to claude.ai/design

From a design-authorized session (`/design-login` in desktop Claude Code, or
seed the project via Claude Design → "Send to Claude Code Web"), ask Claude
to sync this directory to a design-system project. Iterate visually there;
bring decisions back token-first through `src/theme.ts`.
