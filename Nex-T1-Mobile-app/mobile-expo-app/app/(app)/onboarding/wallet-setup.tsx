import { useCallback, useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { WalletCreationCard } from '@presentation/components/wallet/onboarding/wallet-creation-card';
import { useCrossmintWallet } from '@application/hooks/use-crossmint-wallet';
import type { ChainType } from '@domain/wallet/entities/wallet';
import { getChainById, getSolanaChain, getStellarChain } from '@config/chains';

const BASE_CHAIN = getChainById(8453);
const SOLANA_CHAIN = getSolanaChain();
const STELLAR_CHAIN = getStellarChain();

const CHAINS: ReadonlyArray<{
  chain: ChainType;
  name: string;
  chainId?: number | string | undefined;
  iconName?: string | undefined;
}> = [
  {
    chain: 'evm',
    name: 'Base (EVM)',
    chainId: typeof BASE_CHAIN?.id === 'number' ? BASE_CHAIN.id : 8453,
    iconName: BASE_CHAIN?.iconName ?? 'base',
  },
  {
    chain: 'solana',
    name: SOLANA_CHAIN?.name ?? 'Solana',
    chainId: SOLANA_CHAIN?.id,
    iconName: SOLANA_CHAIN?.iconName ?? 'solana',
  },
  {
    chain: 'stellar',
    name: STELLAR_CHAIN?.name ?? 'Stellar',
    chainId: STELLAR_CHAIN?.id,
    iconName: STELLAR_CHAIN?.iconName ?? 'stellar',
  },
];

export default function WalletSetupScreen() {
  const {
    createAllWallets,
    retryChain,
    isReady,
    isCreating,
    walletsCreated,
    failedChains,
    error,
  } = useCrossmintWallet();

  const hasStarted = useRef(false);

  // Auto-start wallet creation on mount
  useEffect(() => {
    if (!hasStarted.current && isReady) {
      hasStarted.current = true;
      void createAllWallets();
    }
  }, [createAllWallets, isReady]);

  const allComplete = walletsCreated.length === CHAINS.length;
  const hasErrors = failedChains.length > 0;

  const getStatus = useCallback(
    (chain: ChainType) => {
      if (walletsCreated.includes(chain)) return 'success' as const;
      if (failedChains.includes(chain)) return 'error' as const;
      if (isCreating) return 'creating' as const;
      return 'pending' as const;
    },
    [walletsCreated, failedChains, isCreating],
  );

  const handleContinue = useCallback(() => {
    router.push('/onboarding/wallet-success');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-12">
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)}>
          <Text variant="h1" className="text-2xl font-bold text-white text-center mb-2">
            Creating Your Wallets
          </Text>
          <Text variant="body" color="secondary" className="text-center mb-8">
            Setting up smart wallets across three chains
          </Text>
        </Animated.View>

        {/* Chain cards */}
        <View className="mb-8">
          {CHAINS.map((item, index) => (
            <WalletCreationCard
              key={item.chain}
              chainName={item.name}
              chainType={item.chain}
              chainId={item.chainId}
              chainIconName={item.iconName}
              status={getStatus(item.chain)}
              index={index}
              onRetry={
                failedChains.includes(item.chain)
                  ? () => {
                      void retryChain(item.chain);
                    }
                  : undefined
              }
            />
          ))}
        </View>

        {/* Loading indicator */}
        {isCreating && (
          <Animated.View entering={FadeInUp.duration(300)} className="items-center mb-4">
            <ActivityIndicator color="#38bdf8" size="small" />
            <Text variant="caption" color="secondary" className="mt-2">
              This may take a moment...
            </Text>
          </Animated.View>
        )}

        {/* Error message */}
        {error && !isCreating && (
          <View className="bg-destructive/10 rounded-xl p-4 mb-4">
            <Text variant="caption" className="text-destructive text-center">
              {error}
            </Text>
          </View>
        )}

        {/* Spacer */}
        <View className="flex-1" />

        {/* Continue button */}
        {(allComplete || (hasErrors && !isCreating && walletsCreated.length > 0)) && (
          <Animated.View entering={FadeInUp.duration(400)}>
            <Button variant="brand" size="lg" fullWidth onPress={handleContinue}>
              {allComplete ? 'Continue' : 'Continue with available wallets'}
            </Button>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
