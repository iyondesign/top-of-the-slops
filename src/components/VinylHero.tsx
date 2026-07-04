import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { devSetAppConfig, serverNow, subscribeBooedOff } from '../channel/channelClient';
import { colors, fonts, motion, radius, space, type } from '../theme';
import type { ChannelState, Track, UserProfile } from '../types';
import { VoteBar } from './VoteBar';

interface Props {
  state: ChannelState;
  track: Track | null;
  size: number;
  listeningEnabled: boolean;
  onTuneIn: () => void;
  profile: UserProfile | null;
}

/**
 * The MD-Vinyl Now Playing hero (plan §15): oversized album art on a
 * spinning record, title/artist, LIVE badge, listener count, progress.
 * Long-press the LIVE pill to flip the dev off-air failsafe.
 */
export function VinylHero({ state, track, size, listeningEnabled, onTuneIn, profile }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const [booed, setBooed] = useState<Track | null>(null);

  useEffect(
    () =>
      subscribeBooedOff((t) => {
        setBooed(t);
        setTimeout(() => setBooed(null), 4_000);
      }),
    [],
  );

  const lamp = useRef(new Animated.Value(1)).current;

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

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const artSize = size * 0.62;

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <Pressable
          onLongPress={() => devSetAppConfig({ isLive: false })}
          style={styles.livePill}
        >
          <Animated.View style={[styles.liveDot, { opacity: lamp }]} />
          <Text style={styles.liveText}>ON AIR</Text>
        </Pressable>
        <View style={styles.listenerPill}>
          <Text style={styles.listenerText}>{state.listenerCount} IN THE ROOM</Text>
        </View>
      </View>

      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={[
            styles.glow,
            { width: size * 0.8, height: size * 0.8, borderRadius: (size * 0.8) / 2 },
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

      <VoteBar state={state} profile={profile} />

      {booed && (
        <View style={styles.booedBanner}>
          <Text style={styles.booedText}>
            💩 “{booed.title}” was booed off the channel!
          </Text>
        </View>
      )}

      {!listeningEnabled && (
        <Pressable style={styles.tuneIn} onPress={onTuneIn}>
          <Text style={styles.tuneInText}>▶ Tap to tune in</Text>
        </Pressable>
      )}
    </View>
  );
}

function ProgressBar({ state, width }: { state: ChannelState; width: number }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const tick = () => {
      setElapsedMs(Math.max(0, serverNow() - state.startedAtServerMs));
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [state.startedAtServerMs, state.durationMs]);

  const progress = Math.min(1, elapsedMs / state.durationMs);
  return (
    <View style={{ width }}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.timecodeRow}>
        <Text style={styles.timecode}>
          {formatMs(Math.min(elapsedMs, state.durationMs))} / {formatMs(state.durationMs)}
        </Text>
        <Text style={styles.channelBug}>TOTS•01</Text>
      </View>
    </View>
  );
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  liveText: {
    color: colors.live,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: fonts.mono,
  },
  listenerPill: {
    backgroundColor: colors.bgRaised,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  listenerText: {
    color: colors.phosphor,
    fontSize: 11,
    fontFamily: fonts.mono,
    letterSpacing: 1,
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.accent,
    opacity: 0.16,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
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
    fontWeight: '900',
    textAlign: 'center',
    maxWidth: 480,
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  artist: { color: colors.textDim, fontSize: type.title, fontWeight: '800', textAlign: 'center' },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgRaised,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.accent },
  timecodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timecode: {
    color: colors.phosphor,
    fontSize: type.micro,
    fontFamily: fonts.mono,
    letterSpacing: 1,
  },
  channelBug: {
    color: colors.textFaint,
    fontSize: type.micro,
    fontFamily: fonts.mono,
    letterSpacing: 2,
  },
  booedBanner: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: colors.slop,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  booedText: { color: colors.slop, fontSize: type.caption, fontWeight: '700' },
  tuneIn: {
    backgroundColor: colors.accent,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radius.full,
  },
  tuneInText: { color: colors.bgSunken, fontWeight: '800', fontSize: type.body },
});
