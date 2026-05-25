import { View, StyleSheet } from 'react-native';
import { colors, radii } from '@/constants/theme';

type ProgressBarProps = {
  total: number;
  current: number;
};

export function ProgressBar({ total, current }: ProgressBarProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.segment, i < current ? styles.active : styles.inactive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radii.full,
  },
  active: {
    backgroundColor: colors.primary,
  },
  inactive: {
    backgroundColor: colors.outlineVariant,
  },
});
