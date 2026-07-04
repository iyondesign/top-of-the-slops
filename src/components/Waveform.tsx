import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { samplePalette, spectrum } from '../theme';

interface Props {
  width: number;
  /** 0..1 — played portion lights up in spectrum color, rest stays dim. */
  progress: number;
  isPlaying: boolean;
  height?: number;
  barCount?: number;
}

/**
 * The live waveform — the spectrum's home (Muzaic-style gradient light on
 * black). Each bar animates its own height on a staggered loop while the
 * channel plays; the played portion is lit in spectrum color sampled per
 * bar (which collectively reads as one gradient), the unplayed remainder
 * stays hairline-dim. Doubles as the progress element.
 */
export function Waveform({ width, progress, isPlaying, height = 30, barCount = 27 }: Props) {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3 + Math.random() * 0.5)),
  ).current;

  useEffect(() => {
    if (!isPlaying) {
      bars.forEach((b) =>
        Animated.timing(b, { toValue: 0.12, duration: 300, useNativeDriver: false }).start(),
      );
      return;
    }
    let stopped = false;
    const animateBar = (bar: Animated.Value) => {
      if (stopped) return;
      Animated.timing(bar, {
        toValue: 0.15 + Math.random() * 0.85,
        duration: 260 + Math.random() * 340,
        useNativeDriver: false,
      }).start(() => animateBar(bar));
    };
    bars.forEach((bar, i) => setTimeout(() => animateBar(bar), i * 24));
    return () => {
      stopped = true;
    };
  }, [isPlaying]);

  const gap = 3;
  const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);

  return (
    <View style={[styles.row, { width, height }]}>
      {bars.map((bar, i) => {
        const t = i / (barCount - 1);
        const lit = t <= progress;
        return (
          <Animated.View
            key={i}
            style={{
              width: barWidth,
              borderRadius: barWidth / 2,
              backgroundColor: lit ? samplePalette(spectrum, t) : 'rgba(255,255,255,0.10)',
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [3, height],
              }),
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
