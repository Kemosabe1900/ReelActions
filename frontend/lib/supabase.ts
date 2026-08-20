import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// iOS Keychain (what SecureStore uses under the hood) caps a single value at
// ~2048 bytes. Supabase's persisted session (access + refresh JWTs) can
// exceed that, so a plain setItemAsync silently fails to persist it — next
// launch reads back nothing and looks exactly like a logout. Split large
// values across multiple keys, each under the limit.
const CHUNK_SIZE = 1800;

async function setChunked(key: string, value: string): Promise<void> {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)));
  await SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length));
  // Clean up a legacy unchunked value so it can't be read back stale later.
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

async function getChunked(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
  if (countStr) {
    const count = parseInt(countStr, 10);
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`))
    );
    if (parts.some((p) => p === null)) return null;
    return parts.join('');
  }
  // Pre-fix session stored under the plain key.
  return SecureStore.getItemAsync(key);
}

async function removeChunked(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
  if (countStr) {
    const count = parseInt(countStr, 10);
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`)));
    await SecureStore.deleteItemAsync(`${key}_chunks`);
  }
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

const ExpoSecureStoreAdapter = {
  getItem: getChunked,
  setItem: setChunked,
  removeItem: removeChunked,
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
