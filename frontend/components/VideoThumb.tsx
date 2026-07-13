import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '@/constants/theme';

export const THUMB_WIDTH = 56;
export const THUMB_HEIGHT = 74;

// Portrait 3:4 thumbnail. The full frame is letterboxed (contain) so nothing
// is cropped, and a blurred copy of the same image fills the empty space
// behind it.
export function VideoThumb({ uri }: { uri: string | null }) {
  if (!uri) {
    return (
      <LinearGradient
        colors={['#1c1c1c', '#252525']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.box, styles.center]}
      >
        <Ionicons name="play" size={18} color={colors.primary} />
      </LinearGradient>
    );
  }
  return (
    <View style={styles.box}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={12} />
      <View style={styles.dim} />
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
    flexShrink: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  image: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
  },
});
