import { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, Animated, Keyboard,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, radii, spacing } from '@/constants/theme';
import { api } from '@/services/api';

const KEYBOARD_OVERLAP = 24;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmitted: (jobId: string, videoId: string, url: string) => void;
};

export function SaveVideoSheet({ visible, onClose, onSubmitted }: Props) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: false }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      slideAnim.setValue(300);
      keyboardOffset.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardOffset, {
          // Overlap the keyboard slightly so the sheet's background fills the
          // gap under the keyboard's rounded top corners (no black wedges).
          toValue: e.endCoordinates.height - KEYBOARD_OVERLAP,
          duration: 160,
          useNativeDriver: false,
        }).start();
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: 140,
          useNativeDriver: false,
        }).start();
      },
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  function reset() {
    setUrl('');
    setSubmitting(false);
    setErrorMsg('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const { job_id, video_id } = await api.videos.submit(trimmed);
      reset();
      onClose();
      onSubmitted(job_id, video_id, trimmed);
    } catch (e: any) {
      setSubmitting(false);
      setErrorMsg(e.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.sheetWrapper, { bottom: keyboardOffset, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Save a video</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="link-outline" size={18} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                placeholder="Paste a video link"
                placeholderTextColor={colors.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus
                editable={!submitting}
              />
              {!url.length && (
                <View style={styles.platformGlyphs}>
                  <Ionicons name="logo-tiktok" size={16} color={colors.outline} />
                  <FontAwesome5 name="instagram" size={16} color={colors.outline} />
                </View>
              )}
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, (!url.trim() || submitting) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!url.trim() || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrapper: { position: 'absolute', left: 0, right: 0 },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.cardInner, paddingTop: 12,
    paddingBottom: KEYBOARD_OVERLAP + 16, gap: 14,
    borderTopWidth: 1, borderColor: '#2e2e2e',
  },
  handle: { width: 36, height: 4, backgroundColor: '#3a3a3a', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.titleLg, color: colors.onSurface, fontFamily: 'HankenGrotesk_700Bold' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.background, borderWidth: 1, borderColor: '#2e2e2e',
    borderRadius: radii.lg, paddingHorizontal: 14, height: 52,
  },
  input: {
    flex: 1, color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular', fontSize: 15,
  },
  platformGlyphs: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { ...typography.bodyBase, color: colors.background, fontFamily: 'HankenGrotesk_700Bold' },
  errorText: { ...typography.bodySm, color: colors.error, fontFamily: 'HankenGrotesk_400Regular', marginTop: -6, marginLeft: 2 },
});
