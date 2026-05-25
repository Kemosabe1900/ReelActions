import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radii, spacing } from '@/constants/theme';
import { api } from '@/services/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmitted: (jobId: string, videoId: string, url: string) => void;
};

export function SaveVideoSheet({ visible, onClose, onSubmitted }: Props) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      const msg = e.message ?? '';
      setErrorMsg(msg.includes('409') ? 'Already in your library' : msg || 'Failed to submit URL');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Save a Video</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>Paste a TikTok or Instagram URL</Text>

          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://www.tiktok.com/..."
            placeholderTextColor={colors.outline}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!submitting}
          />

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.cardInner, paddingBottom: 40, gap: 16,
    borderTopWidth: 1, borderColor: '#2e2e2e',
  },
  handle: { width: 36, height: 4, backgroundColor: '#2e2e2e', borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.titleLg, color: colors.onSurface, fontFamily: 'HankenGrotesk_700Bold' },
  sub: { ...typography.bodySm, color: colors.onSurfaceVariant, fontFamily: 'HankenGrotesk_400Regular', marginTop: -8 },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: '#2e2e2e',
    borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.onSurface, fontFamily: 'HankenGrotesk_400Regular', fontSize: 14,
  },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { ...typography.bodyBase, color: colors.background, fontFamily: 'HankenGrotesk_700Bold' },
  errorText: { ...typography.bodySm, color: colors.error, fontFamily: 'HankenGrotesk_400Regular', marginTop: -8 },
});
