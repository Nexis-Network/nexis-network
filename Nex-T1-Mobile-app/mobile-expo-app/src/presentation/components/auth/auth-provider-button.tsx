import { useCallback } from 'react';
import { Pressable, ActivityIndicator, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// ---------------------------------------------------------------------------
// Provider icon map
// ---------------------------------------------------------------------------

const providerIcons = {
  metamask: require('../../../../assets/chain-icons/MetaMask.svg'),
  phantom: require('../../../../assets/chain-icons/Phantom.svg'),
  apple: require('../../../../assets/social-icons/apple.svg'),
  google: require('../../../../assets/social-icons/google.svg'),
  github: require('../../../../assets/social-icons/github.svg'),
  discord: require('../../../../assets/social-icons/discord.svg'),
  twitter: require('../../../../assets/social-icons/x.svg'),
} as const;

export type AuthProviderType = keyof typeof providerIcons;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AuthProviderButtonProps {
  /** Which provider this button represents. */
  provider: AuthProviderType;
  /** Called when the button is pressed. */
  onPress: () => void;
  /** Whether an auth operation is in-flight for this specific provider. */
  loading?: boolean;
  /** Whether the button should be disabled. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthProviderButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
}: AuthProviderButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityLabel={`Sign in with ${provider}`}
      accessibilityRole="button"
      style={({ pressed }: { pressed: boolean }): ViewStyle => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1a1a1c',
        borderWidth: 1,
        borderColor: pressed && !isDisabled ? '#3a3a3c' : '#2a2a2c',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDisabled ? 0.5 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Image
          source={providerIcons[provider]}
          style={{ width: 24, height: 24 }}
          contentFit="contain"
        />
      )}
    </Pressable>
  );
}
