import { useEffect, useState } from 'react';

import { fetchArtistArtwork, isAppleConfigured } from '../music';
import type { Track } from '../types';

/**
 * The backdrop's star: the current track's ARTIST imagery from the Apple
 * catalog (developer token only — no sign-in needed). Falls back to the
 * album art when the artist has no photo or Apple isn't configured.
 */
export function useArtistArtwork(track: Track | null): string | null {
  const [artistUrl, setArtistUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setArtistUrl(null);
    if (!track || !isAppleConfigured() || track.source !== 'apple') return;
    void fetchArtistArtwork(track.id).then((url) => {
      if (!cancelled) setArtistUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  return artistUrl ?? track?.artworkUrl ?? null;
}
