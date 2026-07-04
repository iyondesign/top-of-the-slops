import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
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
import { Logo } from './src/components/Logo';
import { OffAirCard } from './src/components/OffAirCard';
import { ProfileEditor } from './src/components/ProfileEditor';
import { RoomPanel } from './src/components/RoomPanel';
import { VinylHero } from './src/components/VinylHero';
import { useArtworkTint } from './src/hooks/useArtworkTint';
import { useAppConfig, useChannelState, useCurrentTrack } from './src/hooks/useChannel';
import { useIdentity } from './src/hooks/useIdentity';
import { usePlayback } from './src/hooks/usePlayback';
import { colors, DESKTOP_BREAKPOINT, fonts, radius, space, type } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
  });
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const config = useAppConfig();
  const state = useChannelState();
  const track = useCurrentTrack(state);
  const { profile, update } = useIdentity();
  const { enabled, enable } = usePlayback(state, config);
  const tint = useArtworkTint(track?.artworkUrl);

  useEffect(() => {
    if (profile && !profile.uid.startsWith('local-')) attachPresence(profile.uid);
  }, [profile?.uid]);

  const heroSize = Math.min(isDesktop ? 440 : width - space.xl * 2, 460);

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
      tint={tint}
    />
  ) : (
    <Text style={styles.loading}>Warming up the decks…</Text>
  );

  if (!fontsLoaded) {
    return <View style={styles.canvas} />;
  }

  return (
    <View style={styles.canvas}>
      <AmbientBackdrop artworkUrl={track?.artworkUrl || null} />
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Logo size={26} />
          <View style={styles.channelBug}>
            <Text style={styles.channelBugText}>TOTS•01</Text>
          </View>
        </View>
        {profile && <ProfileEditor profile={profile} onUpdate={update} />}
      </View>

      {isDesktop ? (
        <View style={styles.desktopBody}>
          <View style={styles.heroColumn}>{hero}</View>
          <View style={styles.rail}>
            <RoomPanel profile={profile} config={config} state={state} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.mobileBody}>
          {hero}
          <View style={styles.mobilePanel}>
            <RoomPanel profile={profile} config={config} state={state} />
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md - 4 },
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
  rail: { width: 360 },
  heroColumn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mobileBody: {
    alignItems: 'center',
    padding: space.lg,
    gap: space.lg,
    paddingBottom: space.xl,
  },
  mobilePanel: { width: '100%', height: 440 },
  loading: { color: colors.textDim, fontSize: type.title },
});
