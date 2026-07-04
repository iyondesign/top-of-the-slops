import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { subscribeBooedOff } from '../channel/channelClient';
import { addTrackToLibrary, isAppleConfigured } from '../music';
import { colors, fonts, motion, radius, space, type } from '../theme';
import type { ChannelState, Track, UserProfile } from '../types';
import { GlassPanel } from '../ui/GlassPanel';
import { PressableScale } from '../ui/PressableScale';
import { VotePlaybackBar } from './VotePlaybackBar';

interface Props {
  state: ChannelState;
  track: Track | null;
  size: number;
  profile: UserProfile | null;
  /** Dominant artwork color — re-lights the glow + spindle per track. */
  tint: string;
  muted: boolean;
  onToggleMute: () => void;
}

/**
 * The Now Playing hero: spinning record under a soft signal glow, one
 * line of title · artist, and the smart VotePlaybackBar. Hovering the
 * record grows it slightly and glass controls fly out from behind the
 * disc — local mute (the broadcast never pauses) and save-to-library.
 * Track changes enter with the needle-drop.
 */
export function VinylHero({ state, track, size, profile, tint, muted, onToggleMute }: Props) {
  // Accumulating rotation (degrees) so we can spin up / coast like a real
  // platter rather than snapping between stopped and full speed.
  const rotation = useRef(new Animated.Value(0)).current;
  const accumDeg = useRef(0);
  const loopToken = useRef(0);
  const drop = useRef(new Animated.Value(1)).current;
  const hover = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(false);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [booed, setBooed] = useState<Track | null>(null);

  // Hover physics: the record swells slightly and the controls fly out.
  useEffect(() => {
    Animated.spring(hover, {
      toValue: hovered ? 1 : 0,
      speed: 18,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  }, [hovered]);

  // New track -> fresh save state.
  useEffect(() => setSaved('idle'), [state.currentTrackId]);

  const saveToLibrary = async () => {
    if (!track || saved === 'saving' || saved === 'saved') return;
    setSaved('saving');
    const ok = await addTrackToLibrary(track.id);
    setSaved(ok ? 'saved' : 'failed');
    if (!ok) setTimeout(() => setSaved('idle'), 2_500);
  };

  useEffect(
    () =>
      subscribeBooedOff((t) => {
        setBooed(t);
        setTimeout(() => setBooed(null), 4_000);
      }),
    [],
  );

  useEffect(() => {
    const myToken = ++loopToken.current;

    // Steady 33⅓ rpm, one linear turn at a time (seamless: 360°≡0°).
    const continuous = () => {
      if (loopToken.current !== myToken) return;
      const start = accumDeg.current;
      Animated.timing(rotation, {
        toValue: start + 360,
        duration: motion.rpm33,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && loopToken.current === myToken) {
          accumDeg.current = start + 360;
          continuous();
        }
      });
    };

    if (state.isPlaying) {
      // Spin-up: accelerate from rest into the groove.
      const start = accumDeg.current;
      Animated.timing(rotation, {
        toValue: start + 200,
        duration: 1100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && loopToken.current === myToken) {
          accumDeg.current = start + 200;
          continuous();
        }
      });
    } else {
      // Coast to a stop — momentum bleeding off.
      rotation.stopAnimation((val) => {
        accumDeg.current = val;
        if (loopToken.current !== myToken) return;
        Animated.timing(rotation, {
          toValue: val + 130,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) accumDeg.current = val + 130;
        });
      });
    }

    return () => {
      loopToken.current++;
      rotation.stopAnimation((val) => {
        accumDeg.current = val;
      });
    };
  }, [state.isPlaying]);

  // Needle drop: each new track lands with a spring.
  useEffect(() => {
    drop.setValue(0.94);
    Animated.spring(drop, { toValue: 1, speed: 14, bounciness: 8, useNativeDriver: true }).start();
  }, [state.currentTrackId, state.startedAtServerMs]);

  const rotate = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const artSize = size * 0.62;
  const initial = (track?.artist ?? track?.title ?? '♪').trim().charAt(0).toUpperCase() || '♪';

  const hoverScale = hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const controlOpacity = hover.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
  const controlY = hover.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.44] });
  const controlXL = hover.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.3] });
  const controlXR = hover.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.3] });
  const controlScale = hover.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={styles.container}>
      <Pressable
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={() => setHovered((h) => !h)}
      >
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: Animated.multiply(drop, hoverScale) }],
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

        {/* Glass controls — start hidden behind the disc, fly out below
            it on hover: local mute + save to Apple Music library. */}
        <Animated.View
          pointerEvents={hovered ? 'auto' : 'none'}
          style={[
            styles.controlWrap,
            {
              opacity: controlOpacity,
              transform: [{ translateX: controlXL }, { translateY: controlY }, { scale: controlScale }],
            },
          ]}
        >
          <PressableScale onPress={onToggleMute}>
            <GlassPanel style={styles.controlButton}>
              <Text style={styles.controlIcon}>{muted ? '🔇' : '🔊'}</Text>
            </GlassPanel>
          </PressableScale>
        </Animated.View>
        {isAppleConfigured() && (
          <Animated.View
            pointerEvents={hovered ? 'auto' : 'none'}
            style={[
              styles.controlWrap,
              {
                opacity: controlOpacity,
                transform: [{ translateX: controlXR }, { translateY: controlY }, { scale: controlScale }],
              },
            ]}
          >
            <PressableScale onPress={saveToLibrary}>
              <GlassPanel style={styles.controlButton}>
                <Text style={styles.controlIcon}>
                  {saved === 'saved' ? '✓' : saved === 'saving' ? '…' : saved === 'failed' ? '!' : '＋'}
                </Text>
              </GlassPanel>
            </PressableScale>
          </Animated.View>
        )}
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
                {/* off-center smear so the label's rotation is legible */}
                <View
                  style={[
                    styles.labelSmear,
                    {
                      width: artSize * 0.5,
                      height: artSize * 0.5,
                      borderRadius: artSize * 0.25,
                      top: artSize * 0.1,
                      left: artSize * 0.12,
                      backgroundColor: tint,
                    },
                  ]}
                />
                <Text style={[styles.labelChar, { fontSize: artSize * 0.34 }]}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={[styles.spindle, { borderColor: tint }]} />
        </Animated.View>
      </Animated.View>
      </Pressable>

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
  controlWrap: { position: 'absolute', zIndex: 3 },
  controlButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: { fontSize: 18, color: colors.text },
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
    overflow: 'hidden',
  },
  labelSmear: {
    position: 'absolute',
    opacity: 0.4,
  },
  labelChar: {
    color: colors.text,
    fontFamily: fonts.display,
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
