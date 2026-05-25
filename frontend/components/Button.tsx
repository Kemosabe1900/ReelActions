import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radii, typography } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
};

export function Button({ label, onPress, variant = 'primary', loading = false }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[styles.base, isPrimary ? styles.primary : styles.ghost]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  label: {
    ...typography.titleLg,
  },
  labelPrimary: {
    color: colors.onPrimary,
  },
  labelGhost: {
    color: colors.onSurface,
  },
});
