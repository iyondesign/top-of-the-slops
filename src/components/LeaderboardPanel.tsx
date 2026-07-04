import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { subscribeLeaderboards } from '../channel/channelClient';
import { colors, fonts, radius, space, type } from '../theme';
import type { Leaderboards, UserProfile } from '../types';
import { GlassPanel } from '../ui/GlassPanel';

interface Props {
  profile: UserProfile | null;
}

/**
 * M4's two boards (plan §8.6): the track board (top tracks by net votes)
 * and the tastemaker board — the retention engine — crediting people who
 * called bangers early.
 */
export function LeaderboardPanel({ profile }: Props) {
  const [boards, setBoards] = useState<Leaderboards>({ tracks: [], tastemakers: [] });
  const [tab, setTab] = useState<'tracks' | 'tastemakers'>('tracks');

  useEffect(() => subscribeLeaderboards(setBoards), []);

  return (
    <GlassPanel style={styles.panel}>
      <View style={styles.tabs}>
        <Tab label="Top Slops" active={tab === 'tracks'} onPress={() => setTab('tracks')} />
        <Tab
          label="Tastemakers"
          active={tab === 'tastemakers'}
          onPress={() => setTab('tastemakers')}
        />
      </View>

      <ScrollView contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }}>
        {tab === 'tracks' ? (
          boards.tracks.length === 0 ? (
            <Empty text={'No plays scored yet.\nThe first countdown starts now.'} />
          ) : (
            boards.tracks.map((entry, i) => (
              <View key={entry.track.id} style={styles.row}>
                <Text style={styles.rank}>{i + 1}</Text>
                {entry.track.artworkUrl ? (
                  <Image source={{ uri: entry.track.artworkUrl }} style={styles.art} />
                ) : (
                  <View style={[styles.art, styles.artFallback]}>
                    <Text>💿</Text>
                  </View>
                )}
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {entry.track.title}
                    {entry.booedOff ? '  🚫' : ''}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {entry.track.artist}
                  </Text>
                </View>
                <View style={styles.scoreWrap}>
                  <Text style={[styles.net, entry.net < 0 && styles.netNegative]}>
                    {entry.net > 0 ? `+${entry.net}` : entry.net}
                  </Text>
                  <Text style={styles.tallies}>
                    🔥{entry.fire} 💩{entry.slop}
                  </Text>
                </View>
              </View>
            ))
          )
        ) : boards.tastemakers.length === 0 ? (
          <Empty text={'Nobody has called a banger yet.\nVote early — cred goes to the first ears.'} />
        ) : (
          boards.tastemakers.map((entry, i) => {
            const isYou = profile?.uid === entry.userId;
            return (
              <View key={entry.userId} style={[styles.row, isYou && styles.youRow]}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Text style={styles.tasteAvatar}>{entry.avatar}</Text>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, isYou && { color: colors.accent }]} numberOfLines={1}>
                    {entry.handle}
                    {isYou ? '  (you)' : ''}
                  </Text>
                  <Text style={styles.rowSub}>called it early</Text>
                </View>
                <Text style={styles.tasteScore}>{entry.score}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </GlassPanel>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    padding: space.md,
    minHeight: 260,
  },
  tabs: { flexDirection: 'row', gap: space.sm },
  tab: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgSunken,
  },
  tabActive: { backgroundColor: colors.accentSoft },
  tabText: { color: colors.textFaint, fontSize: type.caption, fontFamily: fonts.displayMedium },
  tabTextActive: { color: colors.accent },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 4,
    paddingHorizontal: space.xs,
    borderRadius: radius.sm,
  },
  youRow: { backgroundColor: colors.accentSoft },
  rank: { color: colors.textFaint, fontSize: type.caption, fontWeight: '800', width: 18 },
  art: { width: 34, height: 34, borderRadius: 6 },
  artFallback: {
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: type.caption, fontWeight: '700' },
  rowSub: { color: colors.textFaint, fontSize: type.micro },
  scoreWrap: { alignItems: 'flex-end' },
  net: { color: colors.fire, fontSize: type.caption, fontWeight: '800' },
  netNegative: { color: colors.slop },
  tallies: { color: colors.textFaint, fontSize: type.micro },
  tasteAvatar: { fontSize: 20 },
  tasteScore: { color: colors.accent, fontSize: type.body, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: space.lg },
  emptyText: {
    color: colors.textFaint,
    fontSize: type.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
