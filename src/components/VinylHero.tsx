import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { devSetAppConfig, subscribeBooedOff } from '../channel/channelClient';
import { colors, fonts, motion, radius, space, type } from '../theme';
import type { ChannelState, Track, UserProfile } from '../types';
import { VotePlaybackBar } from './VotePlaybackBar';

interface Props {
  state: ChannelState;
  track: Track | null;
  size: number;
  profile: UserProfile | null;
  /** Dominant artwork color — re-lights the glow + spindle per track. */
  tint: string;
}

/**
 * The Now Playing hero: spinning record under a soft signal glow, one
 * line of title · artist, and the smart VotePlaybackBar (playback +
 * vote tug fused). Track changes enter with the needle-drop. Long-press
 * the ON AIR pill to flip the dev off-air failsafe.
 */
export function VinylHero({ state, track, size, profile, tint }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const lamp = useRef(new Animated.Value(1)).current;
  const drop = useRef(new Animated.Value(1)).current;
  const [booed, setBooed] = useState<Track | null>(null);

  useEffect(
    () =>
      subscribeBooedOff((t) => {
        setBooed(t);
        setTimeout(() => setBooed(null), 4_000);
      }),
    [],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: motion.rpm33, // ≈33⅓ rpm
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    if (state.isPlaying) loop.start();
    return () => loop.stop();
  }, [state.isPlaying]);

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

  // Needle drop: each new track lands with a spring.
  useEffect(() => {
    drop.setValue(0.94);
    Animated.spring(drop, { toValue: 1, speed: 14, bounciness: 8, useNativeDriver: true }).start();
  }, [state.currentTrackId, state.startedAtServerMs]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const artSize = size * 0.62;

  return (
    <View style={styles.container}>
      <Pressable
        onLongPress={() => devSetAppConfig({ isLive: false })}
        style={styles.livePill}
      >
        <Animated.View style={[styles.liveDot, { opacity: lamp }]} />
        <Text style={styles.liveText}>ON AIR</Text>
      </Pressable>

      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: drop }],
          opacity: drop.interpolate({ inputRange: [0.94, 1], outputRange: [0.6, 1] }),
        }}
      >
        <View
          style={[
            styles.glow,
            {
              width: size * 0.82,
              height: size * 0.82,
              borderRadius: (size * 0.82) / 2,
              backgroundColor: tint,
              shadowColor: tint,
            },
          ]}
        />
        <Animated.View
          style={[styles.record, { width: size, height: size, transform: [{ rotate }] }]}
        >
          {[0.92, 0.8, 0.68].map((scale) => (
            <View
              key={scale}
              style={[
                styles.groove,
                {
                  width: size * scale,
                  height: size * scale,
                  borderRadius: (size * scale) / 2,
                },
              ]}
            />
          ))}
          <View style={[styles.artWrap, { width: artSize, height: artSize, borderRadius: artSize / 2 }]}>
            {track?.artworkUrl ? (
              <Image
                source={{ uri: track.artworkUrl }}
                style={{ width: artSize, height: artSize }}
              />
            ) : (
              <View style={[styles.artFallback, { width: artSize, height: artSize }]}>
                <Text style={{ fontSize: artSize * 0.4 }}>💿</Text>
              </View>
            )}
          </View>
          <View style={[styles.spindle, { borderColor: tint }]} />
        </Animated.View>
      </Animated.View>

      <Text style={styles.trackLine} numberOfLines={1}>
        {track?.title ?? 'Dropping the needle…'}
        {track?.artist ? <Text style={styles.artistInline}>  ·  {track.artist}</Text> : null}
      </Text>

      <VotePlaybackBar state={state} profile={profile} width={size + 56} />

      {booed && (
        <View style={styles.booedBanner}>
          <Text style={styles.booedText}>
            💩 “{booed.title}” was booed off the channel!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: space.md },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderColor: colors.live,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
  liveText: {
    color: colors.live,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: fonts.mono,
  },
  glow: {
    position: 'absolute',
    opacity: 0.1,
    shadowOpacity: 0.5,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 0 },
  },
  record: {
    backgroundColor: colors.vinyl,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.vinylGroove,
  },
  groove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.vinylGroove,
  },
  artWrap: { overflow: 'hidden' },
  artFallback: {
    backgroundColor: colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spindle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bgSunken,
    borderWidth: 2,
  },
  trackLine: {
    color: colors.text,
    fontSize: type.hero - 6,
    fontFamily: fonts.display,
    textAlign: 'center',
    maxWidth: 560,
    letterSpacing: -0.5,
  },
  artistInline: {
    color: colors.textDim,
    fontSize: type.title - 3,
    fontFamily: fonts.displayMedium,
  },
  booedBanner: {
    backgroundColor: 'rgba(178, 101, 255, 0.16)',
    borderColor: colors.slop,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  booedText: { color: colors.slop, fontSize: type.caption, fontWeight: '700' },
});
