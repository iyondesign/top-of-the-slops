import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { sendChatMessage, subscribeChat } from '../chat/chatClient';
import { colors, fonts, radius, space, type } from '../theme';
import type { AppConfig, ChatMessage, UserProfile } from '../types';
import { GlassPanel } from '../ui/GlassPanel';
import { PressableScale } from '../ui/PressableScale';

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

interface Props {
  profile: UserProfile | null;
  config: AppConfig;
}

/**
 * M3: the Discord-style room. Rate-limited input, chatEnabled kill
 * switch, long-press a message to mute its author locally. Report flow +
 * server moderation are the backend half of M3.
 */
export function ChatPanel({ profile, config }: Props) {
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

  const visible = messages.filter((m) => !muted.has(m.userId));

  return (
    <GlassPanel style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>The Room</Text>
        <View style={styles.liveDotWrap}>
          <View style={styles.liveDot} />
          <Text style={styles.headerMeta}>LIVE CHAT</Text>
        </View>
      </View>

      {!config.chatEnabled ? (
        <View style={styles.killSwitch}>
          <Text style={styles.killEmoji}>🔇</Text>
          <Text style={styles.killText}>Chat is taking a breather.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
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
      )}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    padding: space.md,
    minHeight: 260,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  title: { color: colors.text, fontSize: type.body, fontFamily: fonts.display },
  liveDotWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  headerMeta: {
    color: colors.telemetry,
    fontSize: type.micro,
    fontFamily: fonts.mono,
    letterSpacing: 1,
  },
  messages: { flex: 1 },
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
  killSwitch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  killEmoji: { fontSize: 32 },
  killText: { color: colors.textFaint, fontSize: type.caption },
});
