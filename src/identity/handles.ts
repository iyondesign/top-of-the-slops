/** Auto-assigned anonymous handles: adjective-noun-nn (fable spec M1). */

const ADJECTIVES = [
  'neon', 'dusty', 'turbo', 'velvet', 'glitchy', 'cosmic', 'funky', 'shiny',
  'sleepy', 'feral', 'retro', 'crispy', 'moody', 'electric', 'lofi', 'maximal',
];

const NOUNS = [
  'walkman', 'cassette', 'vinyl', 'banger', 'slopper', 'jukebox', 'boombox',
  'groove', 'needle', 'synth', 'chorus', 'remix', 'fader', 'woofer', 'encore',
];

export const AVATARS = ['🎧', '📼', '🔥', '💿', '🎤', '👾', '🕺', '💃', '🛸', '🌈', '🎸', '📀'];

export function randomHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const nn = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${adj}-${noun}-${nn}`;
}

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
