import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '../theme';

interface Props {
  title: string;
  milestone: string;
  blurb: string;
  emoji: string;
}

/**
 * Placeholder rail panels (fable spec M1: "hero + empty side rails").
 * Chat lands here in M3; leaderboards in M4.
 */
export function SideRail({ title, milestone, blurb, emoji }: Props) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{milestone}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.blurb}>{blurb}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.bgRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    minHeight: 180,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  title: { color: colors.text, fontSize: type.body, fontWeight: '700' },
  badge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: { color: colors.accent, fontSize: type.micro, fontWeight: '700' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  emoji: { fontSize: 32 },
  blurb: {
    color: colors.textFaint,
    fontSize: type.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
