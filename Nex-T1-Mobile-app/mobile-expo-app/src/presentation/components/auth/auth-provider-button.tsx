import { useCallback } from 'react';
import { Pressable, ActivityIndicator, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
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
// Constants
// ---------------------------------------------------------------------------

const BUTTON_SIZE = 48;
const ICON_SIZE = 22;
const BORDER_RADIUS = 14;
const BORDER_COLOR = 'rgba(196, 196, 196, 0.08)';
const BG_COLOR = 'rgba(15, 15, 16, 0.7)';

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
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BORDER_RADIUS,
        borderWidth: 1,
        borderColor: pressed && !isDisabled
          ? 'rgba(196, 196, 196, 0.16)'
          : BORDER_COLOR,
        overflow: 'hidden',
        opacity: isDisabled ? 0.5 : 1,
      })}
    >
      <BlurView
        intensity={40}
        tint="dark"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BG_COLOR,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Image
            source={providerIcons[provider]}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
        )}
      </BlurView>
    </Pressable>
  );
}
