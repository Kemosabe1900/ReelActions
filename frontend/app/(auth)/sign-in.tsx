import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing, radii } from '@/constants/theme';

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
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setError(null);
    try {
      await signInWithApple();
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') return;
      setError(e.message ?? 'Apple sign in failed.');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Google sign in failed.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.headline}>Welcome back.</Text>

          <View style={styles.oauthGroup}>
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={radii.full}
                style={styles.appleButton}
                onPress={handleApple}
              />
            )}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} activeOpacity={0.8}>
              <Text style={styles.googleText}>Continue with Google</Text>
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
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={handleEmail} disabled={loading} activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color={colors.onPrimary} />
              : <Text style={styles.ctaText}>Sign In</Text>
            }
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.link}>Terms</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.switchText}>
              Don't have an account?{' '}
              <Text style={styles.switchLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 32,
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
    width: '100%',
  },
  googleButton: {
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    color: '#000000',
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: 16,
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
  },
  eyeButton: {
    padding: 4,
  },
  error: {
    ...typography.bodySm,
    color: '#f87171',
    fontFamily: 'HankenGrotesk_400Regular',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: 14,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
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
