import { Platform } from 'react-native';

/**
 * "Broadcast Vinyl" — the TOTS design language, applied.
 * Single source of styling truth; the visual spec and rationale live in
 * docs/DESIGN.md and the rendered cards in design-system/.
 *
 * One voice per color: gold acts, red is on-air, orange burns (🔥),
 * violet boos (💩), phosphor reports (live telemetry). Never borrow a
 * color for a second job.
 */

export const colors = {
  // Warm near-black studio backdrop — never pure #000
  bg: '#0D0B09',
  bgRaised: '#17130F',
  bgSunken: '#070605',
  border: '#2B241D',

  text: '#F6EFE3',
  textDim: '#AFA28D',
  textFaint: '#6E6355',

  // Gold — brand, primary action, focus
  accent: '#F5A623',
  accentSoft: 'rgba(245, 166, 35, 0.14)',

  // ON AIR lamp + off-air messaging only
  live: '#FF3B30',

  // The vote duality
  fire: '#FF6B2C',
  slop: '#9D6BFF',

  // Live telemetry: timecode, counts, sync readouts
  phosphor: '#35E08A',

  vinyl: '#0A0908',
  vinylGroove: '#221C16',
  vinylLabel: '#F5A623',
} as const;

export const fonts = {
  /** Telemetry stack — every live number renders in this. */
  mono: Platform.select({
    web: "'SF Mono', 'JetBrains Mono', ui-monospace, Menlo, monospace",
    ios: 'Menlo',
    default: 'monospace',
  }) as string,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 24,
  full: 9999,
} as const;

export const type = {
  hero: 30,
  title: 20,
  body: 15,
  caption: 12,
  micro: 10,
} as const;

/** Motion tokens (docs/DESIGN.md) — durations in ms. */
export const motion = {
  /** Vinyl spin ≈ 33⅓ rpm. */
  rpm33: 1800,
  /** Track-change entrance. */
  needleDrop: 400,
  /** 🔥/💩 press spring. */
  votePop: 300,
  /** ON AIR lamp breathing. */
  onAirPulse: 2000,
} as const;

/** Desktop gets hero + side rails; below this it's hero-first stacked. */
export const DESKTOP_BREAKPOINT = 1024;
