import React, { useRef } from 'react';
import { Animated, Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { motion } from '../theme';

interface Props extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Scale at full press; defaults to the motion token. */
  pressedScale?: number;
}

/**
 * The press physics every TOTS touchable shares: a quick spring down to
 * ~0.95 on touch, spring back on release. Objects, not links — nothing
 * interactive is allowed to feel inert (docs/DESIGN.md, "tactile or
 * nothing").
 */
export function PressableScale({ children, style, pressedScale, disabled, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 6,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) to(pressedScale ?? motion.pressScale);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
