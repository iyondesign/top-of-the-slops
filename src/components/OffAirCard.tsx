import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { devSetAppConfig } from '../channel/channelClient';
import { colors, fonts, radius, space, type } from '../theme';

/**
 * The isLive=false failsafe state (fable spec M1): a clean "off air" card
 * instead of a dead or broken hero. Long-press brings the channel back
 * (dev-only, until /app/config is server-controlled).
 */
export function OffAirCard({ size }: { size: number }) {
  return (
    <Pressable
      onLongPress={() => devSetAppConfig({ isLive: true })}
      style={[styles.card, { width: size, height: size }]}
    >
      <Text style={styles.static}>📺</Text>
      <Text style={styles.title}>OFF AIR</Text>
      <Text style={styles.subtitle}>
        The Slop Channel is taking a breather.{'\n'}Back on the decks soon.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  static: { fontSize: 64 },
  title: {
    color: colors.textDim,
    fontSize: type.hero,
    fontFamily: fonts.display,
    letterSpacing: 6,
  },
  subtitle: {
    color: colors.textFaint,
    fontSize: type.body,
    textAlign: 'center',
    lineHeight: 22,
  },
});
