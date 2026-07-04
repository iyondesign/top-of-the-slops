import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { isFirebaseConfigured } from '../firebase';
import type { AuthProviderId, LinkResult } from '../identity/authProviders';
import { AVATARS } from '../identity/handles';
import { colors, fonts, radius, space, type } from '../theme';
import type { UserProfile } from '../types';
import { PressableScale } from '../ui/PressableScale';

interface Props {
  profile: UserProfile;
  onUpdate: (updates: Partial<Pick<UserProfile, 'handle' | 'avatar'>>) => void;
  onLink: (
    provider: AuthProviderId,
    creds?: { email: string; password: string },
  ) => Promise<LinkResult>;
}

const LINK_MESSAGES: Record<string, string> = {
  'not-configured': 'Sign-in lights up once the Firebase project is wired (docs/SETUP-TODO.md).',
  'native-pending': 'On iOS this arrives with the dev build — try the web app for now.',
  'no-session': 'Still getting you a session — try again in a second.',
  cancelled: 'Sign-in cancelled.',
  'wrong-password': 'Wrong password for that account.',
  'weak-password': 'Password needs at least 6 characters.',
  'invalid-email': 'That email doesn’t look right.',
  error: 'Sign-in failed — try again.',
};

/**
 * The identity chip + editor sheet: handle auto-assigned but editable,
 * avatar selectable, and "Keep your cred" — attach iCloud / Google / a
 * direct email account (Firebase Auth) onto the anonymous session so
 * votes and tastemaker cred survive.
 */
export function ProfileEditor({ profile, onUpdate, onLink }: Props) {
  const [open, setOpen] = useState(false);
  const [draftHandle, setDraftHandle] = useState(profile.handle);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [linkNote, setLinkNote] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const save = () => {
    const handle = draftHandle.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (handle.length >= 3) onUpdate({ handle });
    setOpen(false);
  };

  const doLink = async (provider: AuthProviderId, creds?: { email: string; password: string }) => {
    setLinking(true);
    setLinkNote(null);
    const result = await onLink(provider, creds);
    setLinking(false);
    if (result.ok) {
      setLinkNote('✓ Account connected — your cred is safe.');
      setEmailOpen(false);
    } else if (result.reason) {
      setLinkNote(LINK_MESSAGES[result.reason] ?? LINK_MESSAGES.error);
    }
  };

  return (
    <>
      <Pressable
        style={styles.chip}
        onPress={() => {
          setDraftHandle(profile.handle);
          setOpen(true);
        }}
      >
        <Text style={styles.chipAvatar}>{profile.avatar}</Text>
        <Text style={styles.chipHandle}>{profile.handle}</Text>
        <Text style={styles.chipEdit}>✎</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={save}>
        <Pressable style={styles.backdrop} onPress={save}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Your slop identity</Text>
            <Text style={styles.sheetHint}>
              Anonymous for now — sign in later to keep your tastemaker cred.
            </Text>

            <TextInput
              style={styles.input}
              value={draftHandle}
              onChangeText={setDraftHandle}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
              placeholder="your-handle"
              placeholderTextColor={colors.textFaint}
            />

            <View style={styles.avatarGrid}>
              {AVATARS.map((avatar) => (
                <Pressable
                  key={avatar}
                  onPress={() => onUpdate({ avatar })}
                  style={[styles.avatarCell, avatar === profile.avatar && styles.avatarSelected]}
                >
                  <Text style={{ fontSize: 24 }}>{avatar}</Text>
                </Pressable>
              ))}
            </View>

            {/* Keep your cred — progressive auth on Firebase */}
            <View style={styles.credSection}>
              {profile.isAnonymous ? (
                <>
                  <Text style={styles.credTitle}>Keep your cred</Text>
                  <Text style={styles.credHint}>
                    Attach an account so your votes and tastemaker score survive this
                    device.
                  </Text>
                  <View style={styles.credRow}>
                    <PressableScale
                      style={styles.credButton}
                      onPress={() => doLink('apple')}
                      disabled={linking}
                    >
                      <Text style={styles.credButtonText}>iCloud</Text>
                    </PressableScale>
                    <PressableScale
                      style={styles.credButton}
                      onPress={() => doLink('google')}
                      disabled={linking}
                    >
                      <Text style={styles.credButtonText}>G Google</Text>
                    </PressableScale>
                    <PressableScale
                      style={StyleSheet.flatten([
                        styles.credButton,
                        emailOpen && styles.credButtonActive,
                      ])}
                      onPress={() => setEmailOpen((v) => !v)}
                      disabled={linking}
                    >
                      <Text style={styles.credButtonText}>✉️ Email</Text>
                    </PressableScale>
                  </View>
                  {emailOpen && (
                    <View style={styles.emailForm}>
                      <TextInput
                        style={styles.credInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.textFaint}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                      />
                      <TextInput
                        style={styles.credInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="password (6+ characters)"
                        placeholderTextColor={colors.textFaint}
                        secureTextEntry
                      />
                      <PressableScale
                        style={styles.credSubmit}
                        onPress={() => doLink('password', { email, password })}
                        disabled={linking}
                      >
                        <Text style={styles.credSubmitText}>
                          {linking ? 'Connecting…' : 'Create account / sign in'}
                        </Text>
                      </PressableScale>
                    </View>
                  )}
                  {!isFirebaseConfigured() && !linkNote && (
                    <Text style={styles.credNote}>
                      Connects once the Firebase project is wired — see
                      docs/SETUP-TODO.md.
                    </Text>
                  )}
                </>
              ) : (
                <View style={styles.linkedPill}>
                  <Text style={styles.linkedText}>✓ Account connected</Text>
                </View>
              )}
              {linkNote && <Text style={styles.credNote}>{linkNote}</Text>}
            </View>

            <Pressable style={styles.saveButton} onPress={save}>
              <Text style={styles.saveText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  chipAvatar: { fontSize: 16 },
  chipHandle: { color: colors.text, fontSize: type.caption, fontWeight: '600' },
  chipEdit: { color: colors.textFaint, fontSize: type.caption },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  sheetTitle: { color: colors.text, fontSize: type.title, fontFamily: fonts.display },
  sheetHint: { color: colors.textDim, fontSize: type.caption, lineHeight: 18 },
  input: {
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    fontSize: type.body,
  },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  avatarCell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  credSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
    gap: space.sm,
  },
  credTitle: { color: colors.text, fontSize: type.body, fontFamily: fonts.display },
  credHint: { color: colors.textDim, fontSize: type.micro, lineHeight: 15 },
  credRow: { flexDirection: 'row', gap: space.sm },
  credButton: {
    flex: 1,
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  credButtonActive: { borderColor: colors.accent },
  credButtonText: { color: colors.text, fontSize: type.caption, fontFamily: fonts.displayMedium },
  emailForm: { gap: space.sm },
  credInput: {
    backgroundColor: colors.bgSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: type.caption,
  },
  credSubmit: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  credSubmitText: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: type.caption },
  credNote: { color: colors.textFaint, fontSize: type.micro, lineHeight: 15 },
  linkedPill: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.full,
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  linkedText: { color: colors.accent, fontSize: type.caption, fontWeight: '800' },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    alignItems: 'center',
    paddingVertical: space.sm + 2,
  },
  saveText: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: type.body },
});
