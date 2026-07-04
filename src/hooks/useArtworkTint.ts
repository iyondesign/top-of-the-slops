import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { colors } from '../theme';

/**
 * The room re-lights per track: extract a vibrant dominant color from the
 * current artwork and use it to tint the hero glow + spindle. Web-only
 * for now (canvas sampling); native returns the coral signal until the
 * M0 dev build adds react-native-image-colors. Falls back to coral on
 * CORS-tainted canvases or missing artwork.
 */
export function useArtworkTint(artworkUrl: string | null | undefined): string {
  const [tint, setTint] = useState<string>(colors.accent);

  useEffect(() => {
    let cancelled = false;
    if (!artworkUrl) {
      setTint(colors.accent);
      return;
    }
    void extractDominantColor(artworkUrl).then((color) => {
      if (!cancelled) setTint(color ?? colors.accent);
    });
    return () => {
      cancelled = true;
    };
  }, [artworkUrl]);

  return tint;
}

async function extractDominantColor(url: string): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const SIZE = 27;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        // Score pixels for vibrancy: saturated, mid-lightness wins.
        let best: [number, number, number] | null = null;
        let bestScore = 0.08; // floor: near-gray images fall back to coral
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lightness = (max + min) / 510;
          const denom = 255 - Math.abs(max + min - 255);
          const saturation = denom === 0 ? 0 : (max - min) / denom;
          const score = saturation * (1 - Math.abs(lightness - 0.55) * 1.6);
          if (score > bestScore) {
            bestScore = score;
            best = [r, g, b];
          }
        }
        resolve(best ? `rgb(${best[0]}, ${best[1]}, ${best[2]})` : null);
      } catch {
        // Tainted canvas (no CORS) — keep the signal color.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
