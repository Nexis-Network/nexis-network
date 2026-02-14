import { useCallback } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react-native';
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

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Login screen
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const { signIn, isLoading, error } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      const result = await signIn(data.email, data.password);
      if (result.ok) {
        router.replace('/(app)/(tabs)/chat');
      }
    },
    [signIn],
  );

  const errorMessage = error;

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
          {/* Logo */}
          <View className="items-center mb-6">
            <Image
              source={nexisLogo}
              style={{ width: 73, height: 73, marginBottom: 12 }}
              contentFit="contain"
            />
            <Text variant="h1" className="text-2xl font-bold text-white text-center">
              Welcome to Nex T1
            </Text>
            <Text
              variant="caption"
              color="secondary"
              className="mt-2 text-center"
            >
              Your AI-powered trading companion
            </Text>
          </View>

          {/* Error message */}
          {errorMessage ? (
            <View className="bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3 mb-4">
              <Text variant="caption" color="destructive">
                {errorMessage}
              </Text>
            </View>
          ) : null}

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
                containerClassName="mb-3"
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
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                iconLeft={<Lock size={18} color="#636363" />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                containerClassName="mb-5"
              />
            )}
          />

          {/* Sign In button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            onPress={handleSubmit(onSubmit)}
            className="mb-4"
          >
            Sign In
          </Button>

          {/* Auth providers */}
          <View className="mb-4">
            <AuthProviderGrid />
          </View>

          {/* Sign Up link */}
          <View className="flex-row items-center justify-center">
            <Text variant="caption" color="secondary">
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={8}>
                <Text variant="caption" color="brand" className="font-semibold">
                  Sign Up
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
