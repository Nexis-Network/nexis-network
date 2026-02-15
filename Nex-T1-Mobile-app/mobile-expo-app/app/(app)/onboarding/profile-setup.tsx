import { useCallback, useState } from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { User } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { useAuthStore } from '@application/stores/auth-store';
import { markOnboardingComplete } from '@application/hooks/use-onboarding-gate';

export default function ProfileSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Mark onboarding complete in SecureStore
      await markOnboardingComplete();
      // Navigate to main app
      router.replace('/chat');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-12">
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-4">
            <User size={40} color="#38bdf8" />
          </View>
          <Text variant="h1" className="text-2xl font-bold text-white text-center mb-2">
            Almost Done
          </Text>
          <Text variant="body" color="secondary" className="text-center">
            Confirm your display name to complete setup
          </Text>
        </Animated.View>

        {/* Display name input */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Text variant="caption" color="secondary" className="mb-2 font-medium">
            Display Name
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your display name"
            placeholderTextColor="#666"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-white text-base"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={50}
          />
        </Animated.View>

        <View className="flex-1" />

        {/* Complete button */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Button
            variant="brand"
            size="lg"
            fullWidth
            onPress={handleComplete}
            disabled={isSubmitting || !displayName.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              'Complete Setup'
            )}
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
