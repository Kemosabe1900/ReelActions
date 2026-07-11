import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  'https://tvjnuczzlpnydxznbhdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2am51Y3p6bHBueWR4em5iaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2MzcsImV4cCI6MjA5MzUxNjYzN30.g5jV3PEPERxCzENKPdpyoPX-ThHNqhaABaYqO5JGKHE',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

// Supabase RN requires the token refresh timer to follow the app lifecycle.
// Without this, a refresh interrupted mid-background rotates the token
// server-side without persisting it locally, and the next launch presents a
// stale refresh token that trips reuse detection and revokes the session.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
