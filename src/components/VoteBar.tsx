import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { castVote, getUserVote } from '../channel/channelClient';
import { colors, gradients, radius, samplePalette, space, type } from '../theme';
import type { ChannelState, UserProfile, VoteValue } from '../types';
import { PressableScale } from '../ui/PressableScale';

interface Props {
  state: ChannelState;
  profile: UserProfile | null;
}

const TUG_SLICES = 16;

/**
 * The emotional core of the loop: 🔥 banger vs 💩 slop, one vote per
 * track-play. The tally is a gradient tug-of-war — fire's end burns
 * orange→red, slop's end runs violet→magenta (sliced samples of the two
 * gradients). Press = votePop spring on top of the shared press physics.
 */
export function VoteBar({ state, profile }: Props) {
  const [voted, setVoted] = useState<VoteValue | null>(null);
  const fireScale = useRef(new Animated.Value(1)).current;
  const slopScale = useRef(new Animated.Value(1)).current;

  // New track-play -> votes reset.
  useEffect(() => {
    setVoted(profile ? getUserVote(profile.uid) : null);
  }, [state.startedAtServerMs, profile?.uid]);

  const pop = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.35, useNativeDriver: true, speed: 40 }),
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

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <PressableScale onPress={() => vote('fire')} disabled={!!voted}>
          <Animated.View
            style={[
              styles.button,
              styles.fireButton,
              voted === 'fire' && styles.fireVoted,
              voted === 'slop' && styles.dimmed,
              { transform: [{ scale: fireScale }] },
            ]}
          >
            <Text style={styles.buttonEmoji}>🔥</Text>
            <Text style={[styles.count, { color: colors.fire }]}>{state.liveFireCount}</Text>
          </Animated.View>
        </PressableScale>

        <View style={styles.tugTrack}>
          {Array.from({ length: TUG_SLICES }, (_, i) => {
            const t = (i + 0.5) / TUG_SLICES;
            const onFireSide = t <= fireShare;
            const local = onFireSide
              ? fireShare === 0
                ? 0
                : t / fireShare
              : (t - fireShare) / Math.max(1 - fireShare, 0.0001);
            return (
              <View
                key={i}
                style={[
                  styles.tugSlice,
                  {
                    backgroundColor: onFireSide
                      ? samplePalette(gradients.fire, local)
                      : samplePalette(gradients.slop, local),
                  },
                ]}
              />
            );
          })}
        </View>

        <PressableScale onPress={() => vote('slop')} disabled={!!voted}>
          <Animated.View
            style={[
              styles.button,
              styles.slopButton,
              voted === 'slop' && styles.slopVoted,
              voted === 'fire' && styles.dimmed,
              { transform: [{ scale: slopScale }] },
            ]}
          >
            <Text style={styles.buttonEmoji}>💩</Text>
            <Text style={[styles.count, { color: colors.slop }]}>{state.liveSlopCount}</Text>
          </Animated.View>
        </PressableScale>
      </View>
      <Text style={styles.hint}>
        {voted
          ? voted === 'fire'
            ? 'Banger, called. One vote per play.'
            : 'Slop, noted. One vote per play.'
          : 'Banger or slop? You get one call per play.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  fireButton: { borderColor: colors.fire, backgroundColor: 'rgba(255, 122, 61, 0.10)' },
  slopButton: { borderColor: colors.slop, backgroundColor: 'rgba(178, 101, 255, 0.10)' },
  fireVoted: { backgroundColor: 'rgba(255, 122, 61, 0.30)' },
  slopVoted: { backgroundColor: 'rgba(178, 101, 255, 0.30)' },
  dimmed: { opacity: 0.35 },
  buttonEmoji: { fontSize: 20 },
  count: { fontSize: type.body, fontWeight: '800', minWidth: 20, textAlign: 'center' },
  tugTrack: {
    flexDirection: 'row',
    width: 132,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 1,
  },
  tugSlice: { flex: 1 },
  hint: { color: colors.textFaint, fontSize: type.micro },
});
