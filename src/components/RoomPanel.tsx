import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { sendChatMessage, subscribeChat } from '../chat/chatClient';
import { subscribeLeaderboards } from '../channel/channelClient';
import { colors, fonts, radius, space, type } from '../theme';
import type {
  AppConfig,
  ChannelState,
  ChatMessage,
  Leaderboards,
  UserProfile,
} from '../types';
import { GlassPanel } from '../ui/GlassPanel';
import { PressableScale } from '../ui/PressableScale';

type Tab = 'chat' | 'tracks' | 'tastemakers';

interface Props {
  profile: UserProfile | null;
  config: AppConfig;
  state: ChannelState | null;
}

/**
 * The Room — the one social surface (VyRT lesson: a single self-contained
 * column beside a dominant artist visual). Chat, Top Slops, and
 * Tastemakers live behind tabs in one glass panel; presence sits in the
 * panel header, tied to the room rather than floating in the hero. This
 * frees the rest of the viewport for the artwork to own.
 */
export function RoomPanel({ profile, config, state }: Props) {
  const [tab, setTab] = useState<Tab>('chat');
  const [boards, setBoards] = useState<Leaderboards>({ tracks: [], tastemakers: [] });

  useEffect(() => subscribeLeaderboards(setBoards), []);

  return (
    <GlassPanel style={styles.panel}>
      <View style={styles.tabRow}>
        <View style={styles.tabs}>
          <TabButton label="The Room" active={tab === 'chat'} onPress={() => setTab('chat')} />
          <TabButton label="Top Slops" active={tab === 'tracks'} onPress={() => setTab('tracks')} />
          <TabButton
            label="Tastemakers"
            active={tab === 'tastemakers'}
            onPress={() => setTab('tastemakers')}
          />
        </View>
        <View style={styles.presence}>
          <View style={styles.presenceDot} />
          <Text style={styles.presenceText}>{state?.listenerCount ?? '—'}</Text>
        </View>
      </View>

      {tab === 'chat' ? (
        <ChatView profile={profile} config={config} />
      ) : tab === 'tracks' ? (
        <TrackBoard boards={boards} />
      ) : (
        <TastemakerBoard boards={boards} profile={profile} />
      )}
    </GlassPanel>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={StyleSheet.flatten([styles.tab, active && styles.tabActive])}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </PressableScale>
  );
}

// ---------------------------------------------------------------- chat ----

/** Each message lands with a small rise + fade — the room feels alive. */
function MessageEnter({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function ChatView({ profile, config }: { profile: UserProfile | null; config: AppConfig }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => subscribeChat(setMessages), []);
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const send = async () => {
    if (!profile) return;
    const result = await sendChatMessage(profile, draft);
    if (result === 'sent') {
      setDraft('');
      setNotice(null);
    } else if (result === 'rate-limited') {
      setNotice('Easy there — one message every couple of seconds.');
    } else if (result === 'too-long') {
      setNotice('Keep it under 280 characters.');
    }
  };

  const toggleMute = (userId: string) => {
    if (!profile || userId === profile.uid) return;
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  if (!config.chatEnabled) {
    return (
      <View style={styles.killSwitch}>
        <Text style={styles.killEmoji}>🔇</Text>
        <Text style={styles.killText}>Chat is taking a breather.</Text>
      </View>
    );
  }

  const visible = messages.filter((m) => !muted.has(m.userId));

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }}
      >
        {visible.map((m) => (
          <MessageEnter key={m.id}>
            <Pressable onLongPress={() => toggleMute(m.userId)}>
              <View style={styles.messageRow}>
                <Text style={styles.messageAvatar}>{m.avatar}</Text>
                <View style={styles.messageBody}>
                  <Text
                    style={[
                      styles.messageHandle,
                      profile?.uid === m.userId && styles.messageHandleSelf,
                    ]}
                  >
                    {m.handle}
                  </Text>
                  <Text style={styles.messageText}>{m.text}</Text>
                </View>
              </View>
            </Pressable>
          </MessageEnter>
        ))}
        {muted.size > 0 && (
          <Text style={styles.mutedNote}>
            {muted.size} muted — long-press a message to unmute.
          </Text>
        )}
      </ScrollView>

      {notice && <Text style={styles.notice}>{notice}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={profile ? 'Say something…' : 'Getting you a handle…'}
          placeholderTextColor={colors.textFaint}
          editable={!!profile}
          maxLength={280}
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <PressableScale
          style={StyleSheet.flatten([styles.sendButton, !draft.trim() && styles.sendDisabled])}
          onPress={send}
        >
          <Text style={styles.sendText}>↑</Text>
        </PressableScale>
      </View>
    </>
  );
}

// -------------------------------------------------------------- boards ----

function TrackBoard({ boards }: { boards: Leaderboards }) {
  return (
    <ScrollView style={styles.body} contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }}>
      {boards.tracks.length === 0 ? (
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
      )}
    </ScrollView>
  );
}

function TastemakerBoard({ boards, profile }: { boards: Leaderboards; profile: UserProfile | null }) {
  return (
    <ScrollView style={styles.body} contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }}>
      {boards.tastemakers.length === 0 ? (
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
    minHeight: 300,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    gap: space.sm,
  },
  presence: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  presenceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  presenceText: {
    color: colors.telemetry,
    fontSize: type.caption,
    fontFamily: fonts.mono,
    letterSpacing: 0.5,
  },
  tabs: { flexDirection: 'row', gap: space.xs + 1, flexShrink: 1 },
  tab: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgSunken,
  },
  tabActive: { backgroundColor: colors.accentSoft },
  tabText: { color: colors.textFaint, fontSize: type.caption, fontFamily: fonts.displayMedium },
  tabTextActive: { color: colors.accent },
  body: { flex: 1 },

  // chat
  messageRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  messageAvatar: { fontSize: 16, marginTop: 1 },
  messageBody: { flex: 1 },
  messageHandle: { color: colors.textDim, fontSize: type.micro, fontWeight: '700' },
  messageHandleSelf: { color: colors.accent },
  messageText: { color: colors.text, fontSize: type.caption, lineHeight: 18 },
  mutedNote: { color: colors.textFaint, fontSize: type.micro, fontStyle: 'italic' },
  notice: { color: colors.slop, fontSize: type.micro, marginBottom: space.xs },
  inputRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    color: colors.text,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    fontSize: type.caption,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.35 },
  sendText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  killSwitch: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  killEmoji: { fontSize: 32 },
  killText: { color: colors.textFaint, fontSize: type.caption },

  // boards
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 4,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
  },
  youRow: { backgroundColor: colors.accentSoft },
  rank: { color: colors.textFaint, fontSize: type.caption, fontFamily: fonts.mono, width: 18 },
  art: { width: 34, height: 34, borderRadius: 8 },
  artFallback: {
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: type.caption, fontWeight: '700' },
  rowSub: { color: colors.textFaint, fontSize: type.micro },
  scoreWrap: { alignItems: 'flex-end' },
  net: { color: colors.fire, fontSize: type.caption, fontFamily: fonts.mono, fontWeight: '700' },
  netNegative: { color: colors.slop },
  tallies: { color: colors.textFaint, fontSize: type.micro },
  tasteAvatar: { fontSize: 20 },
  tasteScore: { color: colors.accent, fontSize: type.body, fontFamily: fonts.mono, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: space.lg },
  emptyText: {
    color: colors.textFaint,
    fontSize: type.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
