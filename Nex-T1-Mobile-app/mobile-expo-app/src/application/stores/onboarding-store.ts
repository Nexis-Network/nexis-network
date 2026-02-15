/**
 * Onboarding Store
 *
 * Zustand + immer store that tracks the user's progress through the
 * Crossmint smart wallet onboarding flow. Steps are defined by the
 * domain value object `ONBOARDING_STEPS`.
 *
 * State is transient (not persisted). The `useOnboardingGate` hook
 * checks SecureStore for the durable "onboarding complete" flag.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { ChainType } from '@domain/wallet/entities/wallet';
import type { OnboardingStep } from '@domain/wallet/value-objects/onboarding-status';
import { ONBOARDING_STEPS } from '@domain/wallet/value-objects/onboarding-status';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface OnboardingState {
  /** The step currently visible to the user. */
  currentStep: OnboardingStep;
  /** Whether the full onboarding flow has been completed. */
  isComplete: boolean;
  /** Chains for which a wallet was successfully created. */
  walletsCreated: ChainType[];
  /** Chains where wallet creation failed. */
  failedChains: ChainType[];
  /** Whether a wallet creation operation is in-flight. */
  isCreating: boolean;
  /** Last onboarding-related error message. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface OnboardingActions {
  /** Advance to the next onboarding step. Sets `isComplete` on the final step. */
  nextStep: () => void;
  /** Jump directly to a specific step. */
  goToStep: (step: OnboardingStep) => void;
  /** Record a successfully created wallet for the given chain. */
  markWalletCreated: (chain: ChainType) => void;
  /** Record a failed wallet creation for the given chain. */
  markWalletFailed: (chain: ChainType) => void;
  /** Set the creating flag; clears error when starting. */
  setCreating: (creating: boolean) => void;
  /** Set an error message and stop the creating indicator. */
  setError: (error: string | null) => void;
  /** Restore the store to its initial state. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Combined store type
// ---------------------------------------------------------------------------

export type OnboardingStore = OnboardingState & OnboardingActions;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: OnboardingState = {
  currentStep: 'wallet-setup',
  isComplete: false,
  walletsCreated: [],
  failedChains: [],
  isCreating: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useOnboardingStore = create<OnboardingStore>()(
  immer<OnboardingStore>((set) => ({
    ...initialState,

    nextStep: () =>
      set((state) => {
        const currentIndex = ONBOARDING_STEPS.indexOf(state.currentStep);
        const nextIndex = currentIndex + 1;

        if (nextIndex < ONBOARDING_STEPS.length) {
          // ONBOARDING_STEPS is typed as ReadonlyArray<OnboardingStep>, so
          // each element is guaranteed to be an OnboardingStep.
          const next = ONBOARDING_STEPS[nextIndex];
          if (next !== undefined) {
            state.currentStep = next;
            if (next === 'complete') {
              state.isComplete = true;
            }
          }
        }
      }),

    goToStep: (step) =>
      set((state) => {
        state.currentStep = step;
        if (step === 'complete') {
          state.isComplete = true;
        }
      }),

    markWalletCreated: (chain) =>
      set((state) => {
        if (!state.walletsCreated.includes(chain)) {
          state.walletsCreated.push(chain);
        }
        state.failedChains = state.failedChains.filter((c) => c !== chain);
      }),

    markWalletFailed: (chain) =>
      set((state) => {
        if (!state.failedChains.includes(chain)) {
          state.failedChains.push(chain);
        }
      }),

    setCreating: (creating) =>
      set((state) => {
        state.isCreating = creating;
        if (creating) {
          state.error = null;
        }
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
        state.isCreating = false;
      }),

    reset: () => set(() => ({ ...initialState })),
  })),
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectCurrentStep = (state: OnboardingStore): OnboardingStep =>
  state.currentStep;
export const selectIsComplete = (state: OnboardingStore): boolean =>
  state.isComplete;
export const selectWalletsCreated = (state: OnboardingStore): ChainType[] =>
  state.walletsCreated;
export const selectFailedChains = (state: OnboardingStore): ChainType[] =>
  state.failedChains;
export const selectIsCreating = (state: OnboardingStore): boolean =>
  state.isCreating;
