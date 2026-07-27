import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Constants from 'expo-constants';
import { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { unregisterPushToken } from '@/services/notifications';
import { DEV_MODE } from '@/constants/config';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// GoogleSignin is a native module that isn't present in Expo Go, so load it
// lazily and only configure it in a real build (otherwise Expo Go crashes).
let googleConfigured = false;
function getGoogleSignin() {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  if (!googleConfigured) {
    GoogleSignin.configure({
      webClientId: '717091202273-0efdabhcget79dqv8tsecjiobb2cav90.apps.googleusercontent.com',
      iosClientId: '717091202273-on70ho1hd33imehrkq8vaa2e3mh77gac.apps.googleusercontent.com',
    });
    googleConfigured = true;
  }
  return GoogleSignin;
}

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  verifySignupOtp: (email: string, token: string) => Promise<void>;
  resendSignupOtp: (email: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!DEV_MODE);

  useEffect(() => {
    if (DEV_MODE) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string) => {
    // With email confirmation on, signUp returns no session; the caller then
    // collects the emailed code and calls verifySignupOtp. If confirmation is
    // off, a session comes back here and onAuthStateChange signs the user in.
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) setSession(data.session);
  };

  const verifySignupOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) throw error;
  };

  const resendSignupOtp = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithApple = async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    if (IS_EXPO_GO) throw new Error('Google sign-in requires a native build');
    const GoogleSignin = getGoogleSignin();
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    const idToken = result.data?.idToken;
    if (!idToken) throw new Error('No Google ID token returned');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await unregisterPushToken();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, signUpWithEmail, verifySignupOtp, resendSignupOtp, signInWithEmail, signInWithApple, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
