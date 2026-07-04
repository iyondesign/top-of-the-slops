import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { addToPool, subscribeTrackPool } from '../channel/channelClient';
import { useMusicAuth } from '../hooks/useMusicAuth';
import { fetchUserLibrary, searchCatalog } from '../music';
import { colors, fonts, radius, space, type } from '../theme';
import type { Track } from '../types';
import { GlassPanel } from '../ui/GlassPanel';
import { PressableScale } from '../ui/PressableScale';

/**
 * The "Add a banger" surface: connect Apple Music (real MusicKit auth
 * once a developer token is set) and search the catalog to feed your
 * favorites into the shared candidate pool the conductor plays for
 * everyone (plan §8 — favorites feed the pool, not a private playlist).
 */
export function AddToPool() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [poolIds, setPoolIds] = useState<Set<string>>(new Set());
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [library, setLibrary] = useState<Track[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { status, connecting, connect, configured } = useMusicAuth();

  // The proof of auth: once connected, pull the user's actual library.
  useEffect(() => {
    if (!open || status !== 'subscriber' || libraryLoaded || libraryLoading) return;
    setLibraryLoading(true);
    void fetchUserLibrary(24).then((tracks) => {
      setLibrary(tracks);
      setLibraryLoading(false);
      setLibraryLoaded(true);
    });
  }, [open, status, libraryLoaded, libraryLoading]);

  useEffect(
    () => subscribeTrackPool((tracks) => setPoolIds(new Set(tracks.map((t) => t.id)))),
    [],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const found = await searchCatalog(query);
      setResults(found);
      setSearching(false);
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const add = (track: Track) => {
    if (addToPool(track)) {
      setJustAdded((prev) => new Set(prev).add(track.id));
    }
  };

  const connectLabel =
    status === 'subscriber'
      ? '✓ Apple Music connected'
      : connecting
        ? 'Connecting…'
        : configured
          ? '🍎 Connect Apple Music'
          : '🍎 Apple Music — not configured yet';

  return (
    <>
      <PressableScale style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>＋ Add a banger</Text>
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.sheetWrap}>
            <GlassPanel style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>Feed the channel</Text>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.subtitle}>
                Your favorites join the shared pool the channel plays for everyone —
                and the crowd votes them 🔥 or 💩.
              </Text>

              {/* Apple Music connect */}
              <Pressable
                style={[styles.connect, status === 'subscriber' && styles.connectDone]}
                disabled={!configured || connecting || status === 'subscriber'}
                onPress={connect}
              >
                <Text
                  style={[styles.connectText, status === 'subscriber' && styles.connectTextDone]}
                >
                  {connectLabel}
                </Text>
              </Pressable>
              {!configured && (
                <Text style={styles.note}>
                  Sign-in lights up once an Apple Developer token is set. Search still
                  works now — tracks play as 30s previews until then.
                </Text>
              )}

              {/* Search */}
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Search a song or artist…"
                placeholderTextColor={colors.textFaint}
                autoCorrect={false}
              />

              <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
                {searching && <ActivityIndicator color={colors.accent} style={{ marginTop: space.md }} />}
                {!searching &&
                  results.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      inPool={poolIds.has(track.id) || justAdded.has(track.id)}
                      onAdd={add}
                    />
                  ))}
                {!searching && query.trim() !== '' && results.length === 0 && (
                  <Text style={styles.empty}>No tracks found.</Text>
                )}

                {/* Your music, received: the library the user token unlocked. */}
                {status === 'subscriber' && query.trim() === '' && (
                  <View style={styles.librarySection}>
                    <Text style={styles.libraryHeader}>FROM YOUR APPLE MUSIC LIBRARY</Text>
                    {libraryLoading && (
                      <ActivityIndicator color={colors.accent} style={{ marginTop: space.sm }} />
                    )}
                    {!libraryLoading &&
                      library.map((track) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          inPool={poolIds.has(track.id) || justAdded.has(track.id)}
                          onAdd={add}
                        />
                      ))}
                    {!libraryLoading && libraryLoaded && library.length === 0 && (
                      <Text style={styles.empty}>
                        Connected, but your library came back empty — try searching instead.
                      </Text>
                    )}
                  </View>
                )}
              </ScrollView>
            </GlassPanel>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function TrackRow({
  track,
  inPool,
  onAdd,
}: {
  track: Track;
  inPool: boolean;
  onAdd: (track: Track) => void;
}) {
  return (
    <View style={styles.resultRow}>
      {track.artworkUrl ? (
        <Image source={{ uri: track.artworkUrl }} style={styles.resultArt} />
      ) : (
        <View style={[styles.resultArt, styles.resultArtFallback]}>
          <Text>💿</Text>
        </View>
      )}
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.resultArtist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>
      <PressableScale
        style={StyleSheet.flatten([styles.addBtn, inPool && styles.addBtnDone])}
        onPress={() => onAdd(track)}
        disabled={inPool}
      >
        <Text style={[styles.addBtnText, inPool && styles.addBtnTextDone]}>
          {inPool ? '✓ In pool' : '＋ Add'}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 7,
  },
  triggerText: { color: colors.text, fontSize: type.caption, fontFamily: fonts.displayMedium },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  sheetWrap: { width: '100%', maxWidth: 460 },
  sheet: { padding: space.lg, maxHeight: 560 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: colors.text, fontSize: type.title, fontFamily: fonts.display },
  close: { color: colors.textDim, fontSize: type.body },
  subtitle: {
    color: colors.textDim,
    fontSize: type.caption,
    lineHeight: 18,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  connect: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    alignItems: 'center',
    paddingVertical: space.sm + 2,
  },
  connectDone: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  connectText: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: type.body },
  connectTextDone: { color: colors.accent },
  note: {
    color: colors.textFaint,
    fontSize: type.micro,
    lineHeight: 15,
    marginTop: space.sm,
  },
  input: {
    marginTop: space.md,
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    fontSize: type.body,
  },
  results: { marginTop: space.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs + 2,
  },
  resultArt: { width: 40, height: 40, borderRadius: 8 },
  resultArtFallback: {
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBody: { flex: 1, minWidth: 0 },
  resultTitle: { color: colors.text, fontSize: type.caption, fontWeight: '700' },
  resultArtist: { color: colors.textFaint, fontSize: type.micro },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  addBtnDone: { borderColor: colors.border },
  addBtnText: { color: colors.accent, fontSize: type.micro, fontWeight: '800' },
  addBtnTextDone: { color: colors.textFaint },
  empty: { color: colors.textFaint, fontSize: type.caption, textAlign: 'center', marginTop: space.md },
  librarySection: {
    marginTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.sm,
  },
  libraryHeader: {
    color: colors.telemetry,
    fontSize: type.micro,
    fontFamily: fonts.mono,
    letterSpacing: 1,
    marginBottom: space.xs,
  },
});
