/**
 * TOTS visual DNA (plan §2/§15): MD Vinyl — album-art-forward, warm and
 * tactile — wrapped in a live "broadcast channel" overlay.
 */

export const colors = {
  // Warm near-black studio backdrop
  bg: '#12100e',
  bgRaised: '#1c1917',
  bgSunken: '#0c0a09',
  border: '#2e2a26',

  text: '#f5efe6',
  textDim: '#a89f93',
  textFaint: '#6b6359',

  // Warm amber — the "on air" glow
  accent: '#f59e0b',
  accentSoft: 'rgba(245, 158, 11, 0.16)',

  live: '#ef4444',
  fire: '#f97316',
  slop: '#8b5cf6',

  vinyl: '#0a0a0a',
  vinylGroove: '#26221f',
  vinylLabel: '#f59e0b',
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
  md: 14,
  lg: 22,
  full: 9999,
} as const;

export const type = {
  hero: 30,
  title: 20,
  body: 15,
  caption: 12,
  micro: 10,
} as const;

/** Desktop gets hero + side rails; below this it's hero-first stacked. */
export const DESKTOP_BREAKPOINT = 1024;
