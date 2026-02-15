/**
 * useOnboardingGate Hook
 *
 * Checks SecureStore for the durable "onboarding complete" flag. If the
 * flag is missing the user is redirected to the wallet-setup screen via
 * expo-router. When onboarding finishes, `markOnboardingComplete()` is
 * called to persist the flag so the gate is skipped on future launches.
 *
 * IMPORTANT: `ISecureStorage.getItem()` returns `Promise<Result<…>>`,
 * not a raw string. The Result must be unwrapped before use.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import type { ISecureStorage } from '@domain/common/ports/secure-storage';
import { container, ServiceKeys } from '@application/container';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseOnboardingGateReturn {
  /** Whether the user has completed onboarding. `null` while loading. */
  readonly isOnboarded: boolean | null;
  /** Whether the gate check is still in progress. */
  readonly isChecking: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOnboardingGate(): UseOnboardingGateReturn {
  const router = useRouter();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkOnboarding(): Promise<void> {
      try {
        const secureStorage = container.resolve<ISecureStorage>(
          ServiceKeys.SecureStorage,
        );
        const result = await secureStorage.getItem(ONBOARDING_COMPLETE_KEY);

        if (cancelled) return;

        if (result.ok && result.value === 'true') {
          setIsOnboarded(true);
        } else {
          setIsOnboarded(false);
          router.replace('/onboarding/wallet-setup');
        }
      } catch {
        if (!cancelled) {
          setIsOnboarded(false);
          router.replace('/onboarding/wallet-setup');
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    void checkOnboarding();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { isOnboarded, isChecking };
}

// ---------------------------------------------------------------------------
// Utility: mark onboarding as complete
// ---------------------------------------------------------------------------

/**
 * Persist the onboarding completion flag to SecureStore.
 *
 * Call this after the user finishes the last onboarding step so that
 * `useOnboardingGate` no longer redirects on subsequent app launches.
 */
export async function markOnboardingComplete(): Promise<void> {
  const secureStorage = container.resolve<ISecureStorage>(
    ServiceKeys.SecureStorage,
  );
  await secureStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}
