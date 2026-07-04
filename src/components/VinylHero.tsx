import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { devSetAppConfig, serverNow } from '../channel/channelClient';
import { colors, radius, space, type } from '../theme';
import type { ChannelState, Track } from '../types';

interface Props {
  state: ChannelState;
  track: Track | null;
  size: number;
  listeningEnabled: boolean;
  onTuneIn: () => void;
}

/**
 * The MD-Vinyl Now Playing hero (plan §15): oversized album art on a
 * spinning record, title/artist, LIVE badge, listener count, progress.
 * Long-press the LIVE pill to flip the dev off-air failsafe.
 */
export function VinylHero({ state, track, size, listeningEnabled, onTuneIn }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1800, // ~33rpm
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    if (state.isPlaying) loop.start();
    return () => loop.stop();
  }, [state.isPlaying]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const artSize = size * 0.62;

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <Pressable
          onLongPress={() => devSetAppConfig({ isLive: false })}
          style={styles.livePill}
        >
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </Pressable>
        <View style={styles.listenerPill}>
          <Text style={styles.listenerText}>👥 {state.listenerCount} in the room</Text>
        </View>
      </View>

      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
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
          <View style={styles.spindle} />
        </Animated.View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {track?.title ?? 'Dropping the needle…'}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {track?.artist ?? ''}
      </Text>

      <ProgressBar state={state} width={size} />

      {!listeningEnabled && (
        <Pressable style={styles.tuneIn} onPress={onTuneIn}>
          <Text style={styles.tuneInText}>▶ Tap to tune in</Text>
        </Pressable>
      )}
    </View>
  );
}

function ProgressBar({ state, width }: { state: ChannelState; width: number }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tick = () => {
      const elapsed = serverNow() - state.startedAtServerMs;
      setProgress(Math.min(1, Math.max(0, elapsed / state.durationMs)));
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [state.startedAtServerMs, state.durationMs]);

  return (
    <View style={[styles.progressTrack, { width }]}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: space.md },
  badgeRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.live,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
  liveText: { color: colors.live, fontWeight: '800', fontSize: type.caption, letterSpacing: 2 },
  listenerPill: {
    backgroundColor: colors.bgRaised,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  listenerText: { color: colors.textDim, fontSize: type.caption },
  record: {
    backgroundColor: colors.vinyl,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: colors.vinylLabel,
  },
  title: {
    color: colors.text,
    fontSize: type.hero,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 480,
  },
  artist: { color: colors.textDim, fontSize: type.title, textAlign: 'center' },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgRaised,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.accent },
  tuneIn: {
    backgroundColor: colors.accent,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radius.full,
  },
  tuneInText: { color: colors.bgSunken, fontWeight: '800', fontSize: type.body },
});
