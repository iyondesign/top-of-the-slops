import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { attachPresence } from './src/channel/channelClient';
import { AmbientBackdrop } from './src/components/AmbientBackdrop';
import { ChatPanel } from './src/components/ChatPanel';
import { LeaderboardPanel } from './src/components/LeaderboardPanel';
import { OffAirCard } from './src/components/OffAirCard';
import { ProfileEditor } from './src/components/ProfileEditor';
import { VinylHero } from './src/components/VinylHero';
import { useAppConfig, useChannelState, useCurrentTrack } from './src/hooks/useChannel';
import { useIdentity } from './src/hooks/useIdentity';
import { usePlayback } from './src/hooks/usePlayback';
import { colors, DESKTOP_BREAKPOINT, fonts, radius, space, type } from './src/theme';

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const config = useAppConfig();
  const state = useChannelState();
  const track = useCurrentTrack(state);
  const { profile, update } = useIdentity();
  const { enabled, enable } = usePlayback(state, config);

  useEffect(() => {
    if (profile && !profile.uid.startsWith('local-')) attachPresence(profile.uid);
  }, [profile?.uid]);

  const heroSize = Math.min(isDesktop ? 360 : width - space.xl * 2, 400);

  const hero = !config.isLive ? (
    <OffAirCard size={heroSize} />
  ) : state ? (
    <VinylHero
      state={state}
      track={track}
      size={heroSize}
      listeningEnabled={enabled}
      onTuneIn={enable}
      profile={profile}
    />
  ) : (
    <Text style={styles.loading}>Warming up the decks…</Text>
  );

  return (
    <View style={styles.canvas}>
      <AmbientBackdrop artworkUrl={track?.artworkUrl || null} />
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Text style={styles.wordmark}>
            TOP OF THE <Text style={styles.wordmarkAccent}>SLOPS</Text>
          </Text>
          <View style={styles.channelBug}>
            <Text style={styles.channelBugText}>TOTS•01</Text>
          </View>
        </View>
        {profile && <ProfileEditor profile={profile} onUpdate={update} />}
      </View>

      {isDesktop ? (
        <View style={styles.desktopBody}>
          <View style={styles.rail}>
            <ChatPanel profile={profile} config={config} />
          </View>
          <View style={styles.heroColumn}>{hero}</View>
          <View style={styles.rail}>
            <LeaderboardPanel profile={profile} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.mobileBody}>
          {hero}
          <View style={styles.mobilePanels}>
            <View style={styles.mobilePanel}>
              <ChatPanel profile={profile} config={config} />
            </View>
            <View style={styles.mobilePanel}>
              <LeaderboardPanel profile={profile} />
            </View>
          </View>
        </ScrollView>
      )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wordmark: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: '900',
    letterSpacing: 2,
  },
  wordmarkAccent: { color: colors.accent },
  channelBug: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSunken,
    borderRadius: radius.sm - 2,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  channelBugText: {
    color: colors.telemetry,
    fontSize: type.micro,
    fontFamily: fonts.mono,
    letterSpacing: 2,
  },
  desktopBody: {
    flex: 1,
    flexDirection: 'row',
    gap: space.lg,
    padding: space.lg,
    alignItems: 'stretch',
  },
  rail: { flex: 1, maxWidth: 340 },
  heroColumn: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  mobileBody: {
    alignItems: 'center',
    padding: space.lg,
    gap: space.lg,
    paddingBottom: space.xl,
  },
  mobilePanels: { width: '100%', gap: space.md },
  mobilePanel: { height: 320 },
  loading: { color: colors.textDim, fontSize: type.title },
});
