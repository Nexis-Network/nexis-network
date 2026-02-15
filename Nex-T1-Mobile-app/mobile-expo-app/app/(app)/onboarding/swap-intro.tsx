import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { ArrowLeftRight } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';

export default function SwapIntroScreen() {
  const handleContinue = useCallback(() => {
    router.push('/onboarding/profile-setup');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-12 items-center">
        {/* Icon */}
        <Animated.View entering={FadeIn.duration(600)} className="mb-8 mt-12">
          <View className="w-24 h-24 rounded-3xl bg-brand-muted items-center justify-center">
            <ArrowLeftRight size={48} color="#38bdf8" />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <Text variant="h1" className="text-2xl font-bold text-white text-center mb-4">
            Swap Tokens
          </Text>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)}>
          <Text variant="body" color="secondary" className="text-center leading-6 mb-4">
            Swap tokens on Solana using Jupiter, the leading DEX aggregator.
            Get the best rates across multiple liquidity sources.
          </Text>
        </Animated.View>

        {/* Feature list */}
        <Animated.View entering={FadeInUp.duration(500).delay(400)} className="w-full">
          {['Best rates via Jupiter aggregation', 'Swap any Solana token', 'Low fees and fast execution'].map(
            (feature) => (
              <View key={feature} className="flex-row items-center mb-3">
                <View className="w-2 h-2 rounded-full bg-brand mr-3" />
                <Text variant="body" className="text-white">
                  {feature}
                </Text>
              </View>
            ),
          )}
        </Animated.View>

        <View className="flex-1" />

        {/* Continue */}
        <Animated.View entering={FadeInUp.duration(400).delay(500)} className="w-full">
          <Button variant="brand" size="lg" fullWidth onPress={handleContinue}>
            Continue
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
