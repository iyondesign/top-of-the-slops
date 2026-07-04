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
import {
  fetchPlaylistTracks,
  fetchRecentTracks,
  fetchUserLibrary,
  fetchUserPlaylists,
  searchCatalog,
  type MusicPlaylist,
} from '../music';
import { colors, fonts, radius, space, type } from '../theme';
import type { Track } from '../types';
import { GlassPanel } from '../ui/GlassPanel';
import { PressableScale } from '../ui/PressableScale';

/**
 * The "Add a banger" surface: connect Apple Music (real MusicKit auth
 * once a developer token is set) and search the catalog to feed your
 * favorites into the shared candidate pool the conductor plays for
 * everyone (plan §8 — favorites feed the pool, not a private playlist).
 *
 * AddToPool = nav trigger + sheet; AddToPoolSheet is also opened by the
 * Room's "Request a song" (live-radio request line).
 */
export function AddToPool() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PressableScale style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>＋ Add a banger</Text>
      </PressableScale>
      <AddToPoolSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AddToPoolSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [poolIds, setPoolIds] = useState<Set<string>>(new Set());
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse-your-music state: Recents is the default (people pick from
  // what they actually play, not from "A.A.R.O.N. — A.B.C.").
  type BrowseMode = 'recents' | 'playlists' | 'library';
  const [mode, setMode] = useState<BrowseMode>('recents');
  const [browseTracks, setBrowseTracks] = useState<Track[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [playlists, setPlaylists] = useState<MusicPlaylist[] | null>(null);
  const [openPlaylist, setOpenPlaylist] = useState<MusicPlaylist | null>(null);

  const { status, connecting, connect, configured } = useMusicAuth();

  // Load whatever the current browse view needs, lazily.
  useEffect(() => {
    if (!open || status !== 'subscriber') return;
    let cancelled = false;
    setBrowseLoading(true);
    const load = async (): Promise<Track[]> => {
      if (mode === 'recents') return fetchRecentTracks(30);
      if (mode === 'library') return fetchUserLibrary(50);
      if (openPlaylist) return fetchPlaylistTracks(openPlaylist.id, 100);
      if (!playlists) setPlaylists(await fetchUserPlaylists(50));
      return [];
    };
    void load().then((tracks) => {
      if (cancelled) return;
      setBrowseTracks(tracks);
      setBrowseLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, status, mode, openPlaylist]);

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
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.sheetWrap}>
            <GlassPanel style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>Feed the channel</Text>
                <Pressable onPress={onClose} hitSlop={10}>
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

                {/* Your music, received: recents / playlists / A–Z. */}
                {status === 'subscriber' && query.trim() === '' && (
                  <View style={styles.librarySection}>
                    <View style={styles.browseChips}>
                      {(
                        [
                          ['recents', 'Recents'],
                          ['playlists', 'Playlists'],
                          ['library', 'A–Z'],
                        ] as const
                      ).map(([m, label]) => (
                        <PressableScale
                          key={m}
                          style={StyleSheet.flatten([
                            styles.chip,
                            mode === m && styles.chipActive,
                          ])}
                          onPress={() => {
                            setOpenPlaylist(null);
                            setMode(m);
                          }}
                        >
                          <Text style={[styles.chipText, mode === m && styles.chipTextActive]}>
                            {label}
                          </Text>
                        </PressableScale>
                      ))}
                    </View>

                    {browseLoading && (
                      <ActivityIndicator color={colors.accent} style={{ marginTop: space.sm }} />
                    )}

                    {/* Playlist picker */}
                    {!browseLoading && mode === 'playlists' && !openPlaylist && (
                      <>
                        {(playlists ?? []).map((pl) => (
                          <PressableScale
                            key={pl.id}
                            style={styles.playlistRow}
                            onPress={() => setOpenPlaylist(pl)}
                          >
                            {pl.artworkUrl ? (
                              <Image source={{ uri: pl.artworkUrl }} style={styles.resultArt} />
                            ) : (
                              <View style={[styles.resultArt, styles.resultArtFallback]}>
                                <Text>🎶</Text>
                              </View>
                            )}
                            <Text style={styles.playlistName} numberOfLines={1}>
                              {pl.name}
                            </Text>
                            <Text style={styles.playlistChevron}>›</Text>
                          </PressableScale>
                        ))}
                        {playlists !== null && playlists.length === 0 && (
                          <Text style={styles.empty}>No playlists in your library yet.</Text>
                        )}
                      </>
                    )}

                    {/* Inside a playlist */}
                    {mode === 'playlists' && openPlaylist && (
                      <View style={styles.playlistHeader}>
                        <PressableScale onPress={() => setOpenPlaylist(null)}>
                          <Text style={styles.backLink}>‹ Playlists</Text>
                        </PressableScale>
                        <Text style={styles.playlistTitle} numberOfLines={1}>
                          {openPlaylist.name}
                        </Text>
                        {!browseLoading && browseTracks.length > 0 && (
                          <PressableScale
                            style={styles.addAll}
                            onPress={() => browseTracks.forEach((t) => add(t))}
                          >
                            <Text style={styles.addAllText}>＋ Add all</Text>
                          </PressableScale>
                        )}
                      </View>
                    )}

                    {/* Track rows for recents / library / open playlist */}
                    {!browseLoading &&
                      (mode !== 'playlists' || openPlaylist) &&
                      browseTracks.map((track) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          inPool={poolIds.has(track.id) || justAdded.has(track.id)}
                          onAdd={add}
                        />
                      ))}
                    {!browseLoading &&
                      (mode !== 'playlists' || openPlaylist) &&
                      browseTracks.length === 0 && (
                        <Text style={styles.empty}>Nothing here yet — try searching instead.</Text>
                      )}
                  </View>
                )}
              </ScrollView>
            </GlassPanel>
        </Pressable>
      </Pressable>
    </Modal>
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
  browseChips: { flexDirection: 'row', gap: space.xs + 2, marginBottom: space.xs },
  chip: {
    paddingHorizontal: space.sm + 4,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.bgSunken,
  },
  chipActive: { backgroundColor: colors.accentSoft },
  chipText: { color: colors.textFaint, fontSize: type.caption, fontFamily: fonts.displayMedium },
  chipTextActive: { color: colors.accent },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs + 2,
  },
  playlistName: { flex: 1, color: colors.text, fontSize: type.caption, fontWeight: '700' },
  playlistChevron: { color: colors.textFaint, fontSize: type.title },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs + 2,
  },
  backLink: { color: colors.accent, fontSize: type.caption, fontWeight: '700' },
  playlistTitle: { flex: 1, color: colors.text, fontSize: type.caption, fontFamily: fonts.display },
  addAll: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: space.sm + 4,
    paddingVertical: 5,
  },
  addAllText: { color: colors.accent, fontSize: type.micro, fontWeight: '800' },
});
