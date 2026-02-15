/**
 * Unit tests for the Onboarding Store.
 *
 * Validates the Zustand + immer store that tracks the user's progress
 * through the Crossmint smart wallet onboarding flow.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from '@application/stores/onboarding-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the store to its initial state before each test. */
function resetStore(): void {
  useOnboardingStore.getState().reset();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('onboarding-store', () => {
  beforeEach(() => {
    resetStore();
  });

  // ── Initial state ───────────────────────────────────────────────────────

  it('should start with wallet-setup step', () => {
    const state = useOnboardingStore.getState();

    expect(state.currentStep).toBe('wallet-setup');
    expect(state.isComplete).toBe(false);
    expect(state.walletsCreated).toEqual([]);
    expect(state.failedChains).toEqual([]);
    expect(state.isCreating).toBe(false);
    expect(state.error).toBeNull();
  });

  // ── Wallet creation tracking ────────────────────────────────────────────

  it('should track wallet creation per chain', () => {
    const { markWalletCreated, markWalletFailed } =
      useOnboardingStore.getState();

    // Mark evm as created
    markWalletCreated('evm');
    expect(useOnboardingStore.getState().walletsCreated).toEqual(['evm']);

    // Mark solana as failed
    markWalletFailed('solana');
    expect(useOnboardingStore.getState().failedChains).toEqual(['solana']);

    // Now mark solana as created — should remove from failedChains
    markWalletCreated('solana');
    expect(useOnboardingStore.getState().walletsCreated).toEqual([
      'evm',
      'solana',
    ]);
    expect(useOnboardingStore.getState().failedChains).toEqual([]);
  });

  // ── Step advancement ───────────────────────────────────────────────────

  it('should advance to next step correctly', () => {
    const { nextStep } = useOnboardingStore.getState();

    expect(useOnboardingStore.getState().currentStep).toBe('wallet-setup');

    nextStep();
    expect(useOnboardingStore.getState().currentStep).toBe('wallet-success');

    nextStep();
    expect(useOnboardingStore.getState().currentStep).toBe('swap-intro');

    nextStep();
    expect(useOnboardingStore.getState().currentStep).toBe('profile-setup');

    // Should NOT be complete yet
    expect(useOnboardingStore.getState().isComplete).toBe(false);
  });

  // ── Completion on final step ───────────────────────────────────────────

  it('should mark complete on final step', () => {
    const { nextStep } = useOnboardingStore.getState();

    // Advance through all steps
    nextStep(); // wallet-setup -> wallet-success
    nextStep(); // wallet-success -> swap-intro
    nextStep(); // swap-intro -> profile-setup
    nextStep(); // profile-setup -> complete

    expect(useOnboardingStore.getState().currentStep).toBe('complete');
    expect(useOnboardingStore.getState().isComplete).toBe(true);
  });

  // ── goToStep ──────────────────────────────────────────────────────────

  it('should jump to a specific step via goToStep', () => {
    const { goToStep } = useOnboardingStore.getState();

    goToStep('swap-intro');
    expect(useOnboardingStore.getState().currentStep).toBe('swap-intro');
    expect(useOnboardingStore.getState().isComplete).toBe(false);

    goToStep('complete');
    expect(useOnboardingStore.getState().currentStep).toBe('complete');
    expect(useOnboardingStore.getState().isComplete).toBe(true);
  });

  // ── setCreating / setError ────────────────────────────────────────────

  it('should handle creating and error states', () => {
    const { setCreating, setError } = useOnboardingStore.getState();

    // Start creating — should clear error
    setCreating(true);
    expect(useOnboardingStore.getState().isCreating).toBe(true);
    expect(useOnboardingStore.getState().error).toBeNull();

    // Set an error — should stop creating
    setError('Network failure');
    expect(useOnboardingStore.getState().isCreating).toBe(false);
    expect(useOnboardingStore.getState().error).toBe('Network failure');

    // Start creating again — should clear the error
    setCreating(true);
    expect(useOnboardingStore.getState().error).toBeNull();
  });

  // ── reset ──────────────────────────────────────────────────────────────

  it('should restore initial state on reset', () => {
    const { nextStep, markWalletCreated, setError, reset } =
      useOnboardingStore.getState();

    nextStep();
    markWalletCreated('evm');
    setError('Something went wrong');

    // Verify state changed
    expect(useOnboardingStore.getState().currentStep).not.toBe('wallet-setup');

    reset();

    const state = useOnboardingStore.getState();
    expect(state.currentStep).toBe('wallet-setup');
    expect(state.isComplete).toBe(false);
    expect(state.walletsCreated).toEqual([]);
    expect(state.failedChains).toEqual([]);
    expect(state.isCreating).toBe(false);
    expect(state.error).toBeNull();
  });
});
