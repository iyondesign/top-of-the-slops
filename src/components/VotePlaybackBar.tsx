import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { castVote, getUserVote, serverNow } from '../channel/channelClient';
import { colors, fonts, radius, space, type } from '../theme';
import type { ChannelState, UserProfile, VoteValue } from '../types';
import { PressableScale } from '../ui/PressableScale';
import { Waveform } from './Waveform';

interface Props {
  state: ChannelState;
  profile: UserProfile | null;
  width: number;
}

/**
 * The smart bar: playback progress and the vote tug-of-war fused into one
 * line. 🔥 anchors the left end of the waveform, 💩 anchors the right;
 * the lit bars encode BOTH signals — how far the track has played (lit
 * length) and where the room stands (fire colors flood from the left,
 * slop from the right; the crossover is the vote split). One vote per
 * user per track-play; timecode + hint + channel bug ride underneath in
 * one telemetry row.
 */
export function VotePlaybackBar({ state, profile, width }: Props) {
  const [voted, setVoted] = useState<VoteValue | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [waveWidth, setWaveWidth] = useState(0);
  const fireScale = useRef(new Animated.Value(1)).current;
  const slopScale = useRef(new Animated.Value(1)).current;

  // New track-play -> votes reset.
  useEffect(() => {
    setVoted(profile ? getUserVote(profile.uid) : null);
  }, [state.startedAtServerMs, profile?.uid]);

  useEffect(() => {
    const tick = () => setElapsedMs(Math.max(0, serverNow() - state.startedAtServerMs));
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [state.startedAtServerMs, state.durationMs]);

  const pop = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.3, useNativeDriver: true, speed: 40 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const vote = async (value: VoteValue) => {
    if (!profile || voted) return;
    pop(value === 'fire' ? fireScale : slopScale);
    const ok = await castVote(profile.uid, profile.handle, profile.avatar, value, state);
    if (ok) setVoted(value);
  };

  const total = state.liveFireCount + state.liveSlopCount;
  const fireShare = total === 0 ? 0.5 : state.liveFireCount / total;
  const progress = Math.min(1, elapsedMs / state.durationMs);

  return (
    <View style={{ width }}>
      <View style={styles.row}>
        <PressableScale onPress={() => vote('fire')} disabled={!!voted}>
          <Animated.View
            style={[
              styles.pill,
              styles.firePill,
              voted === 'fire' && styles.fireVoted,
              voted === 'slop' && styles.dimmed,
              { transform: [{ scale: fireScale }] },
            ]}
          >
            <Text style={styles.pillEmoji}>🔥</Text>
            <Text style={[styles.count, { color: colors.fire }]}>{state.liveFireCount}</Text>
          </Animated.View>
        </PressableScale>

        <View
          style={styles.waveWrap}
          onLayout={(e) => setWaveWidth(e.nativeEvent.layout.width)}
        >
          {waveWidth > 0 && (
            <Waveform
              width={waveWidth}
              progress={progress}
              isPlaying={state.isPlaying}
              fireShare={fireShare}
              hasVotes={total > 0}
            />
          )}
        </View>

        <PressableScale onPress={() => vote('slop')} disabled={!!voted}>
          <Animated.View
            style={[
              styles.pill,
              styles.slopPill,
              voted === 'slop' && styles.slopVoted,
              voted === 'fire' && styles.dimmed,
              { transform: [{ scale: slopScale }] },
            ]}
          >
            <Text style={styles.pillEmoji}>💩</Text>
            <Text style={[styles.count, { color: colors.slop }]}>{state.liveSlopCount}</Text>
          </Animated.View>
        </PressableScale>
      </View>

      <View style={styles.telemetryRow}>
        <Text style={styles.timecode}>
          {formatMs(Math.min(elapsedMs, state.durationMs))} / {formatMs(state.durationMs)}
        </Text>
        <Text style={styles.hint}>
          {voted ? (voted === 'fire' ? 'BANGER, CALLED' : 'SLOP, NOTED') : 'ONE CALL PER PLAY'}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  waveWrap: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.sm + 4,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  firePill: { borderColor: colors.fire, backgroundColor: 'rgba(255, 122, 61, 0.10)' },
  slopPill: { borderColor: colors.slop, backgroundColor: 'rgba(178, 101, 255, 0.10)' },
  fireVoted: { backgroundColor: 'rgba(255, 122, 61, 0.30)' },
  slopVoted: { backgroundColor: 'rgba(178, 101, 255, 0.30)' },
  dimmed: { opacity: 0.35 },
  pillEmoji: { fontSize: 17 },
  count: { fontSize: type.caption + 1, fontWeight: '800', minWidth: 16, textAlign: 'center' },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  timecode: {
    color: colors.telemetry,
    fontSize: type.micro,
    fontFamily: fonts.mono,
    letterSpacing: 1,
  },
  hint: {
    color: colors.textFaint,
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
});
