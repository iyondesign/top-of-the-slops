import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';

import { colors, samplePalette, spectrum } from '../theme';

const webBlobBlur =
  Platform.OS === 'web' ? ({ filter: 'blur(90px)' } as unknown as ViewStyle) : null;

interface Props {
  artworkUrl: string | null;
}

/**
 * The room's lighting: the current track's artwork, blown up, heavily
 * blurred, and blended into the canvas so it tints the whole viewport
 * without competing with the containers in front (QENARA-style player
 * backdrop). Crossfades on track change. When a track has no artwork
 * (offline fallback pool), soft spectrum color fields keep the ambience
 * alive so glass surfaces always have something to blur.
 */
export function AmbientBackdrop({ artworkUrl }: Props) {
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const [shownUrl, setShownUrl] = useState<string | null>(artworkUrl);

  useEffect(() => {
    if (artworkUrl === shownUrl) return;
    Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
      setShownUrl(artworkUrl);
    });
  }, [artworkUrl]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [shownUrl]);

  const blob = Math.max(width, height) * 0.55;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {shownUrl ? (
        <Animated.Image
          source={{ uri: shownUrl }}
          blurRadius={70}
          resizeMode="cover"
          style={[
            StyleSheet.absoluteFill,
            { opacity: fade, transform: [{ scale: 1.25 }] },
          ]}
        />
      ) : (
        // Artwork-less ambience: three soft spectrum fields.
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <View
            style={[
              styles.blob,
              {
                width: blob,
                height: blob,
                borderRadius: blob / 2,
                top: -blob * 0.3,
                left: -blob * 0.2,
                backgroundColor: samplePalette(spectrum, 0.1),
              },
            ]}
          />
          <View
            style={[
              styles.blob,
              {
                width: blob,
                height: blob,
                borderRadius: blob / 2,
                bottom: -blob * 0.35,
                right: -blob * 0.15,
                backgroundColor: samplePalette(spectrum, 0.85),
              },
            ]}
          />
          <View
            style={[
              styles.blob,
              {
                width: blob * 0.8,
                height: blob * 0.8,
                borderRadius: (blob * 0.8) / 2,
                top: height * 0.35,
                left: width * 0.45,
                backgroundColor: samplePalette(spectrum, 0.5),
              },
            ]}
          />
        </Animated.View>
      )}
      {/* Blend-down scrim: keeps the ambience behind the content, always. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: 0.74 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    opacity: 0.32,
    ...(webBlobBlur as object),
  },
});
