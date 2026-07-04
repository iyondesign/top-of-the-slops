import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, samplePalette, spectrum } from '../theme';

/**
 * The TOTS mark: a vinyl record wearing its spectrum ring — the whole
 * product in one glyph (the record = the music, the ring = the live
 * waveform/progress, the coral label = the signal). In chrome it spins
 * lazily (8s — a record at rest, not a loader). Static brand renders
 * live in design-system/brand/.
 */
export function Logo({ size = 26 }: { size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ring = size * 0.14;
  const dots = 9; // spectrum ring as dotted arc (¾ of the circle)

  return (
    <View style={styles.lockup}>
      <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
        <View
          style={[
            styles.record,
            { width: size, height: size, borderRadius: size / 2, borderWidth: 1 },
          ]}
        />
        {Array.from({ length: dots }, (_, i) => {
          const angle = (i / dots) * Math.PI * 1.5 - Math.PI / 2; // 270° sweep
          const r = size / 2 - ring / 2;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: ring,
                height: ring,
                borderRadius: ring / 2,
                backgroundColor: samplePalette(spectrum, i / (dots - 1)),
                left: size / 2 + r * Math.cos(angle) - ring / 2,
                top: size / 2 + r * Math.sin(angle) - ring / 2,
              }}
            />
          );
        })}
        <View
          style={[
            styles.label,
            {
              width: size * 0.34,
              height: size * 0.34,
              borderRadius: (size * 0.34) / 2,
              left: size * 0.33,
              top: size * 0.33,
            },
          ]}
        />
      </Animated.View>
      <Text style={[styles.wordmark, { fontSize: size * 0.62 }]}>TOTS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  record: {
    backgroundColor: colors.vinyl,
    borderColor: colors.vinylGroove,
  },
  label: {
    position: 'absolute',
    backgroundColor: colors.accent,
  },
  wordmark: {
    color: colors.text,
    fontFamily: fonts.display,
    letterSpacing: 2,
  },
});
