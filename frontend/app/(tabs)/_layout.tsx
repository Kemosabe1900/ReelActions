import { Tabs } from 'expo-router';
import { FloatingNav } from '@/components/FloatingNav';
import { ChatProvider } from '@/contexts/ChatContext';
import { ChatBottomSheet } from '@/components/ChatBottomSheet';

export default function TabsLayout() {
  return (
    <ChatProvider>
      <Tabs
        tabBar={(props) => <FloatingNav {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="library" options={{ title: 'Library' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <ChatBottomSheet />
    </ChatProvider>
  );
}
