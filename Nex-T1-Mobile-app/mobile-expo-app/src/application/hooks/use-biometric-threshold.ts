/**
 * Biometric threshold configuration for send confirmation.
 *
 * Provides a Zustand store with MMKV persistence for managing biometric
 * authentication thresholds during wallet send operations.
 *
 * @module application/hooks/use-biometric-threshold
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvZustandStorage } from '@application/stores/mmkv-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Biometric threshold configuration state.
 */
export interface BiometricThresholdState {
  /**
   * USD threshold above which biometric authentication is required.
   * Set to 0 to always require biometric authentication.
   */
  readonly thresholdUsd: number;

  /**
   * Whether biometric authentication is enabled for send operations.
   * When false, biometric is never required regardless of amount.
   */
  readonly enabled: boolean;
}

/**
 * Biometric threshold store with actions.
 */
interface BiometricThresholdStore extends BiometricThresholdState {
  /**
   * Sets the USD threshold for biometric authentication.
   *
   * @param usd - The threshold amount in USD (must be >= 0)
   */
  setThreshold: (usd: number) => void;

  /**
   * Enables or disables biometric authentication for sends.
   *
   * @param enabled - Whether biometric should be enabled
   */
  setEnabled: (enabled: boolean) => void;

  /**
   * Determines if biometric authentication should be required for a given amount.
   *
   * @param amountUsd - The transaction amount in USD
   * @returns true if biometric authentication should be required
   */
  shouldRequireBiometric: (amountUsd: number) => boolean;
}

// ---------------------------------------------------------------------------
// Default State
// ---------------------------------------------------------------------------

const DEFAULT_STATE: BiometricThresholdState = {
  thresholdUsd: 0,
  enabled: true,
} as const;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Zustand store for biometric threshold configuration.
 *
 * Persisted to MMKV storage for offline access and fast hydration.
 *
 * @example
 * ```ts
 * // Access store directly
 * const threshold = useBiometricThresholdStore.getState().thresholdUsd;
 *
 * // Subscribe to changes
 * const Component = () => {
 *   const enabled = useBiometricThresholdStore((s) => s.enabled);
 *   return <Text>{enabled ? 'Enabled' : 'Disabled'}</Text>;
 * };
 * ```
 */
export const useBiometricThresholdStore = create<BiometricThresholdStore>()(
  persist(
    immer((set, get) => ({
      // State
      thresholdUsd: DEFAULT_STATE.thresholdUsd,
      enabled: DEFAULT_STATE.enabled,

      // Actions
      setThreshold: (usd: number): void => {
        // Validate threshold is non-negative
        const validatedThreshold = Math.max(0, usd);

        set((state) => {
          state.thresholdUsd = validatedThreshold;
        });
      },

      setEnabled: (enabled: boolean): void => {
        set((state) => {
          state.enabled = enabled;
        });
      },

      shouldRequireBiometric: (amountUsd: number): boolean => {
        const { enabled, thresholdUsd } = get();

        // If biometric is disabled, never require it
        if (!enabled) {
          return false;
        }

        // Require biometric if amount meets or exceeds threshold
        // When threshold is 0, this always returns true (amountUsd >= 0)
        return amountUsd >= thresholdUsd;
      },
    })),
    {
      name: 'biometric-threshold',
      storage: createJSONStorage(() => mmkvZustandStorage),
      // Only persist the state fields, not the actions
      partialize: (state): BiometricThresholdState => ({
        thresholdUsd: state.thresholdUsd,
        enabled: state.enabled,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Convenience Hook
// ---------------------------------------------------------------------------

/**
 * Hook for accessing biometric threshold configuration and actions.
 *
 * Provides a stable reference to state and actions for use in components.
 *
 * @returns Object containing threshold state and actions
 *
 * @example
 * ```tsx
 * const SendConfirmation = ({ amountUsd }: { amountUsd: number }) => {
 *   const { shouldRequireBiometric, thresholdUsd, enabled } = useBiometricThreshold();
 *
 *   const requiresBiometric = shouldRequireBiometric(amountUsd);
 *
 *   return (
 *     <View>
 *       <Text>Amount: ${amountUsd}</Text>
 *       {requiresBiometric && <BiometricPrompt />}
 *     </View>
 *   );
 * };
 * ```
 */
export function useBiometricThreshold(): {
  readonly thresholdUsd: number;
  readonly enabled: boolean;
  readonly setThreshold: (usd: number) => void;
  readonly setEnabled: (enabled: boolean) => void;
  readonly shouldRequireBiometric: (amountUsd: number) => boolean;
} {
  return useBiometricThresholdStore((state) => ({
    thresholdUsd: state.thresholdUsd,
    enabled: state.enabled,
    setThreshold: state.setThreshold,
    setEnabled: state.setEnabled,
    shouldRequireBiometric: state.shouldRequireBiometric,
  }));
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Resets the biometric threshold store to default values.
 *
 * Useful for testing or when user wants to reset preferences.
 */
export function resetBiometricThresholdStore(): void {
  useBiometricThresholdStore.setState({
    thresholdUsd: DEFAULT_STATE.thresholdUsd,
    enabled: DEFAULT_STATE.enabled,
  });
}
