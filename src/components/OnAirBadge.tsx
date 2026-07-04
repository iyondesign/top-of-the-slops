import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { devSetAppConfig } from '../channel/channelClient';
import { colors, fonts, motion, radius, space } from '../theme';

/**
 * The ON AIR tally lamp — lives in the global nav, right of the logo.
 * The dot breathes on the onAirPulse token; long-press flips the dev
 * off-air failsafe (the OffAirCard long-press brings it back).
 */
export function OnAirBadge() {
  const lamp = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(lamp, { toValue: 0.5, duration: motion.onAirPulse / 2, useNativeDriver: true }),
        Animated.timing(lamp, { toValue: 1, duration: motion.onAirPulse / 2, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Pressable onLongPress={() => devSetAppConfig({ isLive: false })} style={styles.pill}>
      <Animated.View style={[styles.dot, { opacity: lamp }]} />
      <Text style={styles.text}>ON AIR</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderColor: colors.live,
    borderWidth: 1,
    paddingHorizontal: space.sm + 4,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.live },
  text: {
    color: colors.live,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 2.5,
    fontFamily: fonts.mono,
  },
});
