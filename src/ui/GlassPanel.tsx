import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, GLASS_BLUR, radius } from '../theme';

/**
 * Apple-style frosted glass surface: translucent fill + backdrop blur, so
 * the ambient artwork backdrop reads through as soft color. On web this
 * is a real backdrop-filter; on native the translucent fill stands in
 * until the dev build adds expo-blur (native BlurView) alongside the M0
 * MusicKit module.
 */

const webBlur =
  Platform.OS === 'web'
    ? ({
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
      } as unknown as ViewStyle)
    : null;

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function GlassPanel({ children, style }: Props) {
  return <View style={[styles.glass, webBlur, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});
