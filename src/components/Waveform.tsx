import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, gradients, lerpColor, samplePalette, spectrum } from '../theme';

/** The contested seam glows in the color halfway between the two camps. */
const SEAM_COLOR = lerpColor(colors.fire, colors.slop, 0.5);

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
  /** Both camps have votes → the crossover seam shimmers (it's a fight). */
  contested?: boolean;
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
  contested = false,
}: Props) {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3 + Math.random() * 0.5)),
  ).current;
  const seamX = useRef(new Animated.Value(0)).current;
  const seamPulse = useRef(new Animated.Value(0)).current;

  // The seam breathes while the play is contested…
  useEffect(() => {
    if (!contested) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(seamPulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(seamPulse, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [contested]);

  // …and slides as votes (or playback) move the crossover.
  useEffect(() => {
    Animated.spring(seamX, {
      toValue: width * progress * fireShare,
      speed: 12,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }, [width, progress, fireShare]);

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
      {contested && hasVotes && (
        <Animated.View
          pointerEvents="none"
          style={[styles.seamTrack, { transform: [{ translateX: seamX }] }]}
        >
          <Animated.View
            style={[
              styles.seam,
              {
                height: height + 6,
                shadowColor: SEAM_COLOR,
                opacity: seamPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.95] }),
                transform: [
                  { scaleY: seamPulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) },
                ],
              },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seamTrack: {
    position: 'absolute',
    left: -1.5,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  seam: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
