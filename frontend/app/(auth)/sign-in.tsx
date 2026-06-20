import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Linking,
} from 'react-native';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://getreelactions.com/privacy.html';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { GoogleG } from '@/components/GoogleG';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing, radii } from '@/constants/theme';

const isExpoGo = Constants.appOwnership === 'expo';

export default function SignInScreen() {
  const { signInWithEmail, signInWithApple, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmail = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email first.');
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setError(null);
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') return;
      if (isExpoGo) return;
      setError('Apple sign-in failed. Please use email below.');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code === 'SIGN_IN_CANCELLED' || e.code === '-5') return;
      if (isExpoGo) return;
      setError('Google sign-in failed. Please use email below.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {router.canGoBack() && (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>Sign in.</Text>

          <View style={styles.oauthGroup}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.appleButton} onPress={handleApple} activeOpacity={0.8}>
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.appleText}>Sign in with Apple</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} activeOpacity={0.8}>
              <GoogleG size={20} />
              <Text style={styles.googleText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholderTextColor={colors.onSurfaceVariant}
                placeholder="Email address"
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                placeholderTextColor={colors.onSurfaceVariant}
                placeholder="Password"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.cta} onPress={handleEmail} disabled={loading} activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color={colors.onPrimary} />
              : <Text style={styles.ctaText}>Sign In</Text>
            }
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text> and{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
          </Text>

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 32,
    paddingBottom: 48,
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    marginBottom: 8,
  },
  oauthGroup: {
    gap: 12,
  },
  appleButton: {
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleText: {
    color: '#000000',
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 19,
  },
  googleButton: {
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: {
    color: '#000000',
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 19,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  dividerLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  form: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.cardInner,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  error: {
    ...typography.bodySm,
    color: '#f87171',
    fontFamily: 'HankenGrotesk_400Regular',
  },
  cta: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaText: {
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 16,
  },
  terms: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  switchText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  switchLink: {
    color: colors.primary,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
});
