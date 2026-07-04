import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { OffAirCard } from './src/components/OffAirCard';
import { ProfileEditor } from './src/components/ProfileEditor';
import { SideRail } from './src/components/SideRail';
import { VinylHero } from './src/components/VinylHero';
import { useAppConfig, useChannelState, useCurrentTrack } from './src/hooks/useChannel';
import { useIdentity } from './src/hooks/useIdentity';
import { usePlayback } from './src/hooks/usePlayback';
import { colors, DESKTOP_BREAKPOINT, space, type } from './src/theme';

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const config = useAppConfig();
  const state = useChannelState();
  const track = useCurrentTrack(state);
  const { profile, update } = useIdentity();
  const { enabled, enable } = usePlayback(state, config);

  const heroSize = Math.min(isDesktop ? 380 : width - space.xl * 2, 420);

  const hero = !config.isLive ? (
    <OffAirCard size={heroSize} />
  ) : state ? (
    <VinylHero
      state={state}
      track={track}
      size={heroSize}
      listeningEnabled={enabled}
      onTuneIn={enable}
    />
  ) : (
    <Text style={styles.loading}>Warming up the decks…</Text>
  );

  const chatRail = (
    <SideRail
      title="Chat"
      milestone="M3"
      emoji="💬"
      blurb={'The room opens here soon.\nDiscord-style, live, moderated.'}
    />
  );
  const boardRail = (
    <SideRail
      title="Leaderboards"
      milestone="M4"
      emoji="🔥"
      blurb={'🔥 vs 💩 — top tracks and the\ntastemakers who called them first.'}
    />
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>
          TOP OF THE <Text style={styles.wordmarkAccent}>SLOPS</Text>
        </Text>
        {profile && <ProfileEditor profile={profile} onUpdate={update} />}
      </View>

      {isDesktop ? (
        <View style={styles.desktopBody}>
          <View style={styles.rail}>{chatRail}</View>
          <View style={styles.heroColumn}>{hero}</View>
          <View style={styles.rail}>{boardRail}</View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.mobileBody}>
          {hero}
          <View style={styles.mobilePanels}>
            {chatRail}
            {boardRail}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  wordmark: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: '900',
    letterSpacing: 2,
  },
  wordmarkAccent: { color: colors.accent },
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
  loading: { color: colors.textDim, fontSize: type.title },
});
