import type { Database } from 'firebase-admin/database';

import type { ChannelMeta, Track } from './types.js';

/**
 * Pre-hydrate the pool cache: /tracks/{id} including durationMs, so
 * advance() never makes a live catalog call and can't stall on a slow
 * API (fable spec gotcha #3).
 *
 * Two sources:
 * - APPLE_DEVELOPER_TOKEN set: Apple Music catalog API (developer token
 *   only — no user token needed for metadata) for the ids in
 *   meta.poolTrackIds.
 * - Otherwise (dev): iTunes Search API seeds both the pool and the meta
 *   doc from POOL_SEARCH_TERM. Real full-track durations either way.
 */
export async function hydratePool(db: Database): Promise<void> {
  const metaRef = db.ref('channels/global/meta');
  const metaSnap = await metaRef.get();
  const meta: ChannelMeta = metaSnap.val() ?? {
    title: 'The Slop Channel',
    poolTrackIds: [],
    cooldownMs: 30 * 60_000,
    advanceGraceMs: 5_000,
  };

  const token = process.env.APPLE_DEVELOPER_TOKEN;
  let tracks: Record<string, Track> = {};

  if (token && meta.poolTrackIds.length > 0) {
    tracks = await fetchAppleCatalog(meta.poolTrackIds, token);
  } else {
    const term = process.env.POOL_SEARCH_TERM ?? 'synthwave';
    tracks = await fetchItunesSearch(term);
    meta.poolTrackIds = Object.keys(tracks);
  }

  if (Object.keys(tracks).length === 0) {
    throw new Error('Pool hydration produced no tracks — check token/term');
  }

  await db.ref('tracks').update(tracks);
  await metaRef.set(meta);
  console.log(`[conductor] pool hydrated: ${meta.poolTrackIds.length} tracks`);
}

async function fetchAppleCatalog(
  ids: string[],
  developerToken: string,
): Promise<Record<string, Track>> {
  const storefront = process.env.APPLE_STOREFRONT ?? 'us';
  const out: Record<string, Track> = {};
  // Catalog API caps ids per request; chunk conservatively.
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25);
    const res = await fetch(
      `https://api.music.apple.com/v1/catalog/${storefront}/songs?ids=${chunk.join(',')}`,
      { headers: { Authorization: `Bearer ${developerToken}` } },
    );
    if (!res.ok) throw new Error(`Apple catalog API ${res.status}`);
    const json: any = await res.json();
    for (const song of json.data ?? []) {
      const a = song.attributes ?? {};
      out[song.id] = {
        title: a.name ?? 'Unknown',
        artist: a.artistName ?? 'Unknown',
        artworkUrl: a.artwork?.url
          ? String(a.artwork.url).replace('{w}', '600').replace('{h}', '600')
          : '',
        previewUrl: a.previews?.[0]?.url ?? null,
        durationMs: a.durationInMillis ?? 0,
        source: 'apple',
      };
    }
  }
  return out;
}

async function fetchItunesSearch(term: string): Promise<Record<string, Track>> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=15`,
  );
  if (!res.ok) throw new Error(`iTunes search ${res.status}`);
  const json: any = await res.json();
  const out: Record<string, Track> = {};
  for (const r of json.results ?? []) {
    if (!r.previewUrl || !r.trackTimeMillis) continue;
    out[String(r.trackId)] = {
      title: r.trackName,
      artist: r.artistName,
      artworkUrl: String(r.artworkUrl100 ?? '').replace('100x100', '600x600'),
      previewUrl: r.previewUrl,
      durationMs: r.trackTimeMillis,
      source: 'apple',
    };
  }
  return out;
}
