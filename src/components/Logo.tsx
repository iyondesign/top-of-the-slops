import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

const MARK = require('../../assets/logo-mark.png');

/**
 * The TOTS lockup: the brand mark (the record wearing its spectrum —
 * rendered from design-system/brand/mark.svg into assets/logo-mark.png,
 * same artwork as the app icon) + "TOTS" in Space Grotesk. In chrome the
 * mark spins lazily (8s — a record at rest, not a loader), and only
 * where the channel is live.
 */
export function Logo({ size = 28 }: { size?: number }) {
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

  return (
    <View style={styles.lockup}>
      <Animated.Image
        source={MARK}
        style={{ width: size, height: size, transform: [{ rotate }] }}
        resizeMode="contain"
      />
      <Text style={[styles.wordmark, { fontSize: size * 0.58 }]}>TOTS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: {
    color: colors.text,
    fontFamily: fonts.display,
    letterSpacing: 2,
  },
});
