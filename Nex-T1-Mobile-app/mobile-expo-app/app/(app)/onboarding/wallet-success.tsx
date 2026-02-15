import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp, BounceIn } from 'react-native-reanimated';
import { CheckCircle } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { WalletAddressCard } from '@presentation/components/wallet/onboarding/wallet-address-card';
import { useWalletStore } from '@application/stores/wallet-store';

export default function WalletSuccessScreen() {
  const wallets = useWalletStore((s) => s.wallets);
  const crossmintWallets = wallets.filter((w) => w.walletProvider === 'crossmint');

  const handleContinue = useCallback(() => {
    router.push('/(app)/onboarding/swap-intro');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-12">
        {/* Success icon */}
        <Animated.View entering={BounceIn.duration(600)} className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-success/20 items-center justify-center">
            <CheckCircle size={48} color="#22C55E" />
          </View>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeIn.duration(500).delay(200)}>
          <Text variant="h1" className="text-2xl font-bold text-white text-center mb-2">
            Wallets Ready
          </Text>
          <Text variant="body" color="secondary" className="text-center mb-8">
            Your smart wallets have been created across {crossmintWallets.length} chains
          </Text>
        </Animated.View>

        {/* Wallet cards */}
        {crossmintWallets.map((wallet, index) => (
          <WalletAddressCard key={wallet.id} wallet={wallet} index={index} />
        ))}

        <View className="flex-1" />

        {/* Continue */}
        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <Button variant="brand" size="lg" fullWidth onPress={handleContinue}>
            Continue
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
