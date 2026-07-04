import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AVATARS } from '../identity/handles';
import { colors, radius, space, type } from '../theme';
import type { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onUpdate: (updates: Partial<Pick<UserProfile, 'handle' | 'avatar'>>) => void;
}

/**
 * The identity chip + editor sheet (fable spec M1): handle is
 * auto-assigned but editable, avatar selectable. Sign in with Apple (M4)
 * will hang off this same surface.
 */
export function ProfileEditor({ profile, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [draftHandle, setDraftHandle] = useState(profile.handle);

  const save = () => {
    const handle = draftHandle.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (handle.length >= 3) onUpdate({ handle });
    setOpen(false);
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
  sheetTitle: { color: colors.text, fontSize: type.title, fontWeight: '800' },
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
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    alignItems: 'center',
    paddingVertical: space.sm + 2,
  },
  saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: type.body },
});
