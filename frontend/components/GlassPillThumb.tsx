import { View } from 'react-native';
import { BlurView } from 'expo-blur';

interface Props {
  width?: number;
  height?: number;
}

export function GlassPillThumb({ width = 52, height = 34 }: Props) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: height / 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <BlurView intensity={20} tint="systemUltraThinMaterialLight" style={{ flex: 1 }} />
    </View>
  );
}
