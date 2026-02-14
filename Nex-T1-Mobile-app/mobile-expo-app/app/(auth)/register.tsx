import { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Check } from 'lucide-react-native';
import { Image } from 'expo-image';

import { useAuth } from '@application/hooks/use-auth';
import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { Input } from '@presentation/components/ui/input';
import { AuthProviderGrid } from '@presentation/components/auth/auth-provider-grid';

const nexisLogo = require('../../assets/nexis-logo-icon.svg');

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and a number',
    ),
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Register screen
// ---------------------------------------------------------------------------

export default function RegisterScreen() {
  const { signUp, isLoading, error } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      if (!termsAccepted) return;
      await signUp(data.email, data.password, data.displayName);
    },
    [signUp, termsAccepted],
  );

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mb-6">
            <Image
              source={nexisLogo}
              style={{ width: 73, height: 73, marginBottom: 12 }}
              contentFit="contain"
            />
            <Text variant="h1" className="text-2xl font-bold text-white text-center">
              Create Account
            </Text>
            <Text variant="caption" color="secondary" className="mt-2 text-center">
              Join Nex T1 to start trading with AI
            </Text>
          </View>

          {/* Error message */}
          {error ? (
            <View className="bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3 mb-4">
              <Text variant="caption" color="destructive">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Display name field */}
          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Display Name"
                placeholder="Enter your name"
                autoComplete="name"
                textContentType="name"
                iconLeft={<User size={18} color="#636363" />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.displayName?.message}
                containerClassName="mb-4"
              />
            )}
          />

          {/* Email field */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                iconLeft={<Mail size={18} color="#636363" />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                containerClassName="mb-4"
              />
            )}
          />

          {/* Password field */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Create a strong password"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                iconLeft={<Lock size={18} color="#636363" />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                containerClassName="mb-6"
              />
            )}
          />

          {/* Terms checkbox */}
          <Pressable
            className="flex-row items-start mb-6"
            onPress={() => setTermsAccepted((prev) => !prev)}
            hitSlop={4}
          >
            <View
              className={`w-5 h-5 rounded-[6px] border mr-3 mt-0.5 items-center justify-center ${
                termsAccepted
                  ? 'bg-brand border-brand'
                  : 'bg-input border-border'
              }`}
            >
              {termsAccepted ? <Check size={14} color="#FFFFFF" /> : null}
            </View>
            <Text variant="caption" color="secondary" className="flex-1">
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </Pressable>

          {/* Create Account button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!termsAccepted}
            onPress={handleSubmit(onSubmit)}
            className="mb-4"
          >
            Create Account
          </Button>

          {/* Auth providers */}
          <View className="mb-4">
            <AuthProviderGrid />
          </View>

          {/* Sign In link */}
          <View className="flex-row items-center justify-center">
            <Text variant="caption" color="secondary">
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={8}>
                <Text variant="caption" color="brand" className="font-semibold">
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
