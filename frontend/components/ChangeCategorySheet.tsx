import { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radii, spacing } from '@/constants/theme';
import { getCategoryColor, getCategoryIcon } from '@/constants/categories';
import { api } from '@/services/api';

type Props = {
  visible: boolean;
  videoId: string;
  currentCategory: string | null;
  existingCategories: string[];
  onClose: () => void;
  onUpdated: (newCategory: string) => void;
};

export function ChangeCategorySheet({ visible, videoId, currentCategory, existingCategories, onClose, onUpdated }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      slideAnim.setValue(300);
    }
  }, [visible]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      },
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  function reset() {
    setShowNew(false);
    setNewCategory('');
    setSaving(false);
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function select(category: string) {
    if (category === currentCategory) { handleClose(); return; }
    setSaving(true);
    setError('');
    try {
      await api.videos.updateCategory(videoId, category);
      onUpdated(category);
      reset();
      onClose();
    } catch (e) {
      console.error('[ChangeCategorySheet] update failed:', e);
      setError('Failed to update. Try again.');
      setSaving(false);
    }
  }

  async function submitNew() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    await select(trimmed);
  }

  const categories = existingCategories.filter(c => c !== currentCategory);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Animated.View style={[styles.root, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }], marginBottom: keyboardOffset }]}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>Change Category</Text>
            {currentCategory && (
              <View style={[styles.currentChip, { backgroundColor: getCategoryColor(currentCategory) + '15' }]}>
                <Text style={[styles.currentChipText, { color: getCategoryColor(currentCategory) }]}>{currentCategory}</Text>
              </View>
            )}
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#f87171" />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {categories.map(cat => {
              const color = getCategoryColor(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={styles.row}
                  onPress={() => select(cat)}
                  disabled={saving}
                  activeOpacity={0.65}
                >
                  <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
                    <Ionicons name={getCategoryIcon(cat) as any} size={17} color={color} />
                  </View>
                  <Text style={styles.rowLabel}>{cat}</Text>
                  <View style={[styles.arrow, { backgroundColor: color + '12' }]}>
                    <Ionicons name="chevron-forward" size={13} color={color} />
                  </View>
                </TouchableOpacity>
              );
            })}

            {!showNew ? (
              <TouchableOpacity style={styles.addRow} onPress={() => setShowNew(true)} disabled={saving} activeOpacity={0.65}>
                <View style={styles.addIconWrap}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                </View>
                <Text style={styles.addLabel}>New category</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.newRow}>
                <TextInput
                  style={styles.input}
                  value={newCategory}
                  onChangeText={setNewCategory}
                  placeholder="Category name"
                  placeholderTextColor={colors.onSurfaceVariant}
                  autoFocus
                  onSubmitEditing={submitNew}
                  returnKeyType="done"
                  editable={!saving}
                />
                <TouchableOpacity
                  style={[styles.confirmBtn, (!newCategory.trim() || saving) && styles.confirmBtnDisabled]}
                  onPress={submitNew}
                  disabled={!newCategory.trim() || saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color={colors.background} />
                    : <Ionicons name="checkmark" size={18} color={colors.background} />
                  }
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  currentChip: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentChipText: {
    ...typography.labelCaps,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  error: {
    ...typography.bodySm,
    color: '#f87171',
    fontFamily: 'HankenGrotesk_400Regular',
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowLabel: {
    flex: 1,
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  arrow: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  addIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addLabel: {
    flex: 1,
    ...typography.bodyBase,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  confirmBtn: {
    width: 46,
    height: 46,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  confirmBtnDisabled: { opacity: 0.4 },
});
