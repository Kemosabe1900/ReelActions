import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '@/contexts/ChatContext';
import { colors, radii, spacing } from '@/constants/theme';

type Route = { key: string; name: string };
type NavProps = {
  state: { index: number; routes: Route[] };
  descriptors: Record<string, { options: Record<string, unknown> }>;
  navigation: { emit: (e: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
};

const PILL_TABS: Record<string, { outline: string; filled: string }> = {
  index:   { outline: 'home-outline',     filled: 'home' },
  library: { outline: 'bookmark-outline', filled: 'bookmark' },
  profile: { outline: 'person-outline',   filled: 'person' },
};

export function FloatingNav({ state, navigation }: NavProps) {
  const { openChat } = useChat();

  function press(route: Route, focused: boolean) {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pill}>
        {state.routes
          .filter((r) => r.name !== 'assistant')
          .map((route) => {
            const routeIdx = state.routes.findIndex((r) => r.name === route.name);
            const focused = state.index === routeIdx;
            const icons = PILL_TABS[route.name];
            if (!icons) return null;
            return (
              <TouchableOpacity
                key={route.key}
                style={[styles.pillTab, focused && styles.pillTabActive]}
                onPress={() => press(route, focused)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={focused ? icons.filled : icons.outline}
                  size={24}
                  color={focused ? colors.primary : colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            );
          })}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={openChat}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-outline" size={26} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 28,
    left: spacing.containerPadding,
    right: spacing.containerPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  pillTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  pillTabActive: {
    backgroundColor: colors.primary + '20',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 14,
  },
  fabActive: {
    backgroundColor: '#16a34a',
  },
});
