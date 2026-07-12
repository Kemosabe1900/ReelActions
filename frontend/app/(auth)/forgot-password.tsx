import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radii } from '@/constants/theme';

type Step = 'email' | 'code';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setStep('code');
    } catch {
      setError("Couldn't send the code. Check the email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      if (otpError) {
        setError('Invalid or expired code. Request a new one.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('Could not set the new password. Try again.');
        return;
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>Reset password.</Text>

          {step === 'email' ? (
            <>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a 6-digit code.
              </Text>
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
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity style={styles.cta} onPress={handleSendCode} disabled={loading} activeOpacity={0.8}>
                {loading
                  ? <ActivityIndicator color={colors.onPrimary} />
                  : <Text style={styles.ctaText}>Send Code</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                We sent a code to {email.trim()}. Enter it below with your new password.
              </Text>
              <View style={styles.form}>
                <View style={styles.inputRow}>
                  <Ionicons name="keypad-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor={colors.onSurfaceVariant}
                    placeholder="6-digit code"
                  />
                </View>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    placeholderTextColor={colors.onSurfaceVariant}
                    placeholder="New password"
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

              <TouchableOpacity style={styles.cta} onPress={handleReset} disabled={loading} activeOpacity={0.8}>
                {loading
                  ? <ActivityIndicator color={colors.onPrimary} />
                  : <Text style={styles.ctaText}>Set New Password</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendCode} disabled={loading} hitSlop={8}>
                <Text style={styles.resend}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
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
  subtitle: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    lineHeight: 22,
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
  resend: {
    ...typography.bodySm,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_600SemiBold',
    textAlign: 'center',
    marginTop: 8,
  },
});
