import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Wallet } from '@domain/wallet/entities/wallet';
import { WalletAddressDisplay } from '../primitives/wallet-address-display';

interface WalletAddressCardProps {
  readonly wallet: Wallet;
  readonly index: number;
}

export function WalletAddressCard({ wallet, index }: WalletAddressCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <View className="mb-3">
        <WalletAddressDisplay
          address={wallet.address}
          chainType={wallet.chainType}
          chainId={wallet.chainId}
          label={wallet.label}
        />
      </View>
    </Animated.View>
  );
}
