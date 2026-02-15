import { useCallback, useState, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ExportPrivateKeyButton } from '@crossmint/client-sdk-react-native-ui';
import { ShieldAlert, ArrowLeft } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { container, ServiceKeys } from '@application/container';
import type { IBiometricService } from '@application/container';

export default function WalletExportScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const biometric = useMemo(
    () => container.resolve<IBiometricService>(ServiceKeys.BiometricService),
    [],
  );

  const handleAuthenticate = useCallback(async () => {
    setIsAuthenticating(true);
    const result = await biometric.authenticate(
      'Authenticate to export your private key',
    );
    if (result.ok && result.value) {
      setIsAuthenticated(true);
    }
    setIsAuthenticating(false);
  }, [biometric]);

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-4">
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <Button
            variant="secondary"
            size="sm"
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="white" />
          </Button>
          <Text variant="h1" className="text-lg font-bold text-white ml-4">
            Export Private Key
          </Text>
        </View>

        {/* Warning */}
        <View className="bg-destructive/10 rounded-2xl p-4 mb-6 flex-row">
          <ShieldAlert size={24} color="#EF4444" />
          <View className="flex-1 ml-3">
            <Text variant="body" className="text-destructive font-semibold mb-1">
              Security Warning
            </Text>
            <Text variant="caption" color="secondary">
              Never share your private key. Anyone with your private key has
              full control of your wallet and all assets in it.
            </Text>
          </View>
        </View>

        {/* Biometric gate */}
        {!isAuthenticated ? (
          <View className="items-center mt-8">
            <Text variant="body" color="secondary" className="text-center mb-6">
              Authenticate with biometrics to proceed
            </Text>
            <Button
              variant="primary"
              size="lg"
              onPress={handleAuthenticate}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                'Authenticate'
              )}
            </Button>
          </View>
        ) : (
          <View className="mt-4">
            <ExportPrivateKeyButton
              appearance={{
                colors: { border: '#2A2A2A' },
                borderRadius: '12px',
              }}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
