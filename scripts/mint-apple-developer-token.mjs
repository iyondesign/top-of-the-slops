#!/usr/bin/env node
/**
 * Mint an Apple Music developer token (ES256 JWT) from a MusicKit .p8 key.
 * Zero dependencies — Node 18+ built-in crypto only. The .p8 never leaves
 * your machine; only the printed token goes into .env.
 *
 *   node scripts/mint-apple-developer-token.mjs \
 *     --key ./AuthKey_ABC123DEFG.p8 --kid ABC123DEFG --team YOURTEAMID \
 *     [--days 180]
 */
import { createPrivateKey, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
}

const { key, kid, team } = args;
const days = Math.min(Number(args.days ?? 180), 180); // Apple max: 6 months
if (!key || !kid || !team) {
  console.error(
    'Usage: node scripts/mint-apple-developer-token.mjs --key <AuthKey.p8> --kid <KeyID> --team <TeamID> [--days 180]',
  );
  process.exit(1);
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'ES256', kid }));
const payload = b64url(
  JSON.stringify({ iss: team, iat: now, exp: now + days * 86_400 }),
);
const signingInput = `${header}.${payload}`;

const privateKey = createPrivateKey(readFileSync(key, 'utf8'));
const signature = createSign('SHA256')
  .update(signingInput)
  .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });

const token = `${signingInput}.${b64url(signature)}`;
const expires = new Date((now + days * 86_400) * 1000).toISOString().slice(0, 10);

console.log('\nEXPO_PUBLIC_APPLE_DEVELOPER_TOKEN=' + token);
console.log(`\n(valid until ${expires} — re-run this script to rotate)`);
