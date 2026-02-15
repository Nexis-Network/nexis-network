import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@presentation/components/ui/text';

type CreationStatus = 'pending' | 'creating' | 'success' | 'error';

interface WalletCreationCardProps {
  readonly chainName: string;
  readonly chainIcon: React.ReactNode;
  readonly status: CreationStatus;
  readonly index: number;
  readonly onRetry?: () => void;
}

const STATUS_COLORS: Record<CreationStatus, string> = {
  pending: 'bg-surface-secondary',
  creating: 'bg-brand/20',
  success: 'bg-success/20',
  error: 'bg-destructive/20',
};

const STATUS_TEXT: Record<CreationStatus, string> = {
  pending: 'Waiting...',
  creating: 'Creating...',
  success: 'Created',
  error: 'Failed',
};

export function WalletCreationCard({
  chainName,
  chainIcon,
  status,
  index,
  onRetry,
}: WalletCreationCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 150).duration(400)}>
      <View
        className={`flex-row items-center p-4 rounded-2xl mb-3 border border-border ${STATUS_COLORS[status]}`}
      >
        <View className="w-12 h-12 rounded-xl bg-surface items-center justify-center mr-4">
          {chainIcon}
        </View>
        <View className="flex-1">
          <Text variant="body" className="font-semibold text-white">
            {chainName}
          </Text>
          <Text variant="caption" color="secondary">
            {STATUS_TEXT[status]}
          </Text>
        </View>
        {status === 'error' && onRetry && (
          <View className="px-3 py-1.5 rounded-lg bg-brand/20">
            <Text
              variant="caption"
              className="text-brand font-medium"
              onPress={onRetry}
            >
              Retry
            </Text>
          </View>
        )}
        {status === 'success' && (
          <View className="w-6 h-6 rounded-full bg-success items-center justify-center">
            <Text variant="caption" className="text-white text-xs">
              {'✓'}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
