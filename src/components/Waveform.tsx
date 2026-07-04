import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { gradients, samplePalette, spectrum } from '../theme';

interface Props {
  width: number;
  /** 0..1 — played portion lights up, rest stays dim. */
  progress: number;
  isPlaying: boolean;
  height?: number;
  barCount?: number;
  /**
   * Vote integration (VotePlaybackBar): when the play has votes, the lit
   * region recolors as the tug-of-war — fire gradient floods from the
   * left, slop gradient from the right, crossover = the vote split.
   * Without votes the lit region sings in spectrum color.
   */
  fireShare?: number;
  hasVotes?: boolean;
}

/**
 * The live waveform — gradient light on black. Each bar animates its own
 * height on a staggered loop while the channel plays; the played portion
 * is lit (spectrum, or the vote tug when votes exist), the unplayed
 * remainder stays hairline-dim. Doubles as the progress element.
 */
export function Waveform({
  width,
  progress,
  isPlaying,
  height = 30,
  barCount = 27,
  fireShare = 0.5,
  hasVotes = false,
}: Props) {
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
        let color = 'rgba(255,255,255,0.10)';
        if (lit) {
          if (!hasVotes) {
            color = samplePalette(spectrum, t);
          } else {
            // Position within the lit region drives the tug coloring.
            const local = progress === 0 ? 0 : t / progress;
            color =
              local <= fireShare
                ? samplePalette(gradients.fire, fireShare === 0 ? 0 : local / fireShare)
                : samplePalette(
                    gradients.slop,
                    (local - fireShare) / Math.max(1 - fireShare, 0.0001),
                  );
          }
        }
        return (
          <Animated.View
            key={i}
            style={{
              width: barWidth,
              borderRadius: barWidth / 2,
              backgroundColor: color,
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
