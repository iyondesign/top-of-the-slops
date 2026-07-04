import { Platform } from 'react-native';

/**
 * "Signal" — the TOTS design language, v2.
 * Premium-modern pass after the Beat / Muzaic reference set: neutral rich
 * black (never warm, never pure #000), ONE coral signal color for action
 * and on-air, and a spectrum gradient reserved exclusively for live music
 * energy (waveform, vote tug, mood). Spec + rationale: docs/DESIGN.md;
 * rendered cards: design-system/.
 *
 * One voice per color: coral acts + broadcasts, orange burns (🔥), violet
 * boos (💩), the spectrum sings, neutral mono reports. Never borrow a
 * color for a second job.
 */

export const colors = {
  // Neutral rich black — cool, not warm; never pure #000
  bg: '#0A0A0C',
  bgRaised: '#131318',
  bgSunken: '#050507',
  border: 'rgba(255, 255, 255, 0.07)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',

  text: '#F7F7F8',
  textDim: '#A0A0AA',
  textFaint: '#62626C',

  // Coral — the single signal color: primary action AND on-air
  accent: '#FF4655',
  accentSoft: 'rgba(255, 70, 85, 0.15)',
  live: '#FF4655',

  // The vote duality (ends of the spectrum)
  fire: '#FF7A3D',
  slop: '#B265FF',

  // Live telemetry readouts — quiet neutral mono, never colored
  telemetry: '#9A9AA3',

  vinyl: '#0E0E12',
  vinylGroove: '#202028',
  vinylLabel: '#FF4655',

  // Frosted glass surfaces (over the ambient backdrop)
  glassFill: 'rgba(19, 19, 24, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.09)',
} as const;

/** backdrop-filter spec for glass surfaces (web; native uses expo-blur in M0+). */
export const GLASS_BLUR = 'blur(24px) saturate(160%)';

/**
 * The spectrum — Muzaic-style gradient light on black. Reserved for live
 * music energy only (waveform, tug bar, generative art). Sample it with
 * samplePalette(); never use a spectrum stop as a UI chrome color.
 */
export const spectrum = ['#3D8BFF', '#B265FF', '#FF4FD8', '#FF7A3D'] as const;

export const gradients = {
  fire: ['#FFB13D', '#FF5E3A'] as const,
  slop: ['#8B5CF6', '#FF4FD8'] as const,
} as const;

/**
 * Type voices (loaded in App via expo-font):
 * - display: Space Grotesk — the brand voice: titles, wordmark, buttons,
 *   panel headers. Distinctive without being decorative.
 * - mono: Space Mono — its sibling; every live number (telemetry).
 * - Utility/body text stays on the native system stack (SF on Apple
 *   platforms) — the app speaks in Space, the OS handles the plumbing.
 */
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  mono: Platform.select({
    web: "SpaceMono_400Regular, 'SF Mono', ui-monospace, Menlo, monospace",
    default: 'SpaceMono_400Regular',
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
  hero: 32,
  title: 20,
  body: 15,
  caption: 12,
  micro: 10,
} as const;

/** Motion tokens (docs/DESIGN.md) — durations in ms. */
export const motion = {
  /** Vinyl spin ≈ 33⅓ rpm. */
  rpm33: 1800,
  /** Track-change entrance (scale 0.94→1 spring + fade). */
  needleDrop: 400,
  /** 🔥/💩 press spring. */
  votePop: 300,
  /** ON AIR lamp breathing. */
  onAirPulse: 2000,
  /** Press-down scale for every touchable (PressableScale). */
  pressScale: 0.95,
} as const;

/** Desktop gets hero + side rails; below this it's hero-first stacked. */
export const DESKTOP_BREAKPOINT = 1024;

// ---------------------------------------------------------------------------
// Color math for the spectrum (no gradient dependency needed: bars/slices
// sample the palette per-element, which collectively reads as a gradient).

function hexChannel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

export function lerpColor(a: string, b: string, t: number): string {
  const ch = (i: number) =>
    Math.round(hexChannel(a, i) + (hexChannel(b, i) - hexChannel(a, i)) * t);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

/** Sample a multi-stop palette at t ∈ [0,1]. */
export function samplePalette(stops: readonly string[], t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const seg = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  return lerpColor(stops[i], stops[i + 1], seg - i);
}
