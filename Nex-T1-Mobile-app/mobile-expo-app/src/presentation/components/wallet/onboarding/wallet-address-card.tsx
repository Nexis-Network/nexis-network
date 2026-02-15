import { useCallback } from 'react';
import { View, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Copy } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import type { Wallet } from '@domain/wallet/entities/wallet';

interface WalletAddressCardProps {
  readonly wallet: Wallet;
  readonly index: number;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletAddressCard({ wallet, index }: WalletAddressCardProps) {
  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(wallet.address);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [wallet.address]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <View className="bg-surface rounded-2xl p-4 mb-3 border border-border">
        <View className="flex-row items-center justify-between mb-2">
          <Text variant="caption" color="secondary" className="font-medium uppercase text-xs">
            {wallet.label}
          </Text>
          <View className="px-2 py-0.5 rounded bg-brand/20">
            <Text variant="caption" className="text-brand text-xs">
              {wallet.chainType.toUpperCase()}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleCopy}
          className="flex-row items-center"
          hitSlop={8}
        >
          <Text variant="body" className="text-white font-mono flex-1">
            {truncateAddress(wallet.address)}
          </Text>
          <Copy size={16} color="#8B8B8B" />
        </Pressable>
      </View>
    </Animated.View>
  );
}
