/**
 * Unit tests for useBiometricThreshold hook and store.
 *
 * Tests the Zustand store for biometric threshold configuration including
 * state management, persistence behavior, and the shouldRequireBiometric logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock MMKV Storage
// ---------------------------------------------------------------------------

// Create mock storage before importing the module under test
const mockStorage = new Map<string, string>();

vi.mock('react-native-mmkv', () => ({
  MMKV: vi.fn().mockImplementation(() => ({
    getString: (key: string): string | undefined => mockStorage.get(key),
    set: (key: string, value: string): void => {
      mockStorage.set(key, value);
    },
    delete: (key: string): void => {
      mockStorage.delete(key);
    },
    clearAll: (): void => {
      mockStorage.clear();
    },
  })),
}));

// ---------------------------------------------------------------------------
// Import module under test (after mocks are set up)
// ---------------------------------------------------------------------------

import {
  useBiometricThresholdStore,
  resetBiometricThresholdStore,
} from '@application/hooks/use-biometric-threshold';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/**
 * Resets the store to default state before each test.
 */
function resetStore(): void {
  mockStorage.clear();
  resetBiometricThresholdStore();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBiometricThresholdStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ── Default Values ───────────────────────────────────────────────────────

  describe('default values', () => {
    it('should have thresholdUsd of 0 by default', () => {
      const state = useBiometricThresholdStore.getState();

      expect(state.thresholdUsd).toBe(0);
    });

    it('should have enabled as true by default', () => {
      const state = useBiometricThresholdStore.getState();

      expect(state.enabled).toBe(true);
    });
  });

  // ── setThreshold ─────────────────────────────────────────────────────────

  describe('setThreshold', () => {
    it('should update thresholdUsd when set to a positive value', () => {
      const { setThreshold } = useBiometricThresholdStore.getState();

      setThreshold(100);

      const state = useBiometricThresholdStore.getState();
      expect(state.thresholdUsd).toBe(100);
    });

    it('should allow setting threshold to 0', () => {
      const { setThreshold } = useBiometricThresholdStore.getState();

      setThreshold(50);
      expect(useBiometricThresholdStore.getState().thresholdUsd).toBe(50);

      setThreshold(0);
      expect(useBiometricThresholdStore.getState().thresholdUsd).toBe(0);
    });

    it('should clamp negative values to 0', () => {
      const { setThreshold } = useBiometricThresholdStore.getState();

      setThreshold(-50);

      const state = useBiometricThresholdStore.getState();
      expect(state.thresholdUsd).toBe(0);
    });

    it('should handle decimal values', () => {
      const { setThreshold } = useBiometricThresholdStore.getState();

      setThreshold(99.99);

      const state = useBiometricThresholdStore.getState();
      expect(state.thresholdUsd).toBe(99.99);
    });

    it('should handle very large values', () => {
      const { setThreshold } = useBiometricThresholdStore.getState();

      setThreshold(1_000_000);

      const state = useBiometricThresholdStore.getState();
      expect(state.thresholdUsd).toBe(1_000_000);
    });
  });

  // ── setEnabled ───────────────────────────────────────────────────────────

  describe('setEnabled', () => {
    it('should disable biometric when set to false', () => {
      const { setEnabled } = useBiometricThresholdStore.getState();

      setEnabled(false);

      const state = useBiometricThresholdStore.getState();
      expect(state.enabled).toBe(false);
    });

    it('should enable biometric when set to true', () => {
      const { setEnabled } = useBiometricThresholdStore.getState();

      // First disable
      setEnabled(false);
      expect(useBiometricThresholdStore.getState().enabled).toBe(false);

      // Then enable
      setEnabled(true);
      expect(useBiometricThresholdStore.getState().enabled).toBe(true);
    });
  });

  // ── shouldRequireBiometric ───────────────────────────────────────────────

  describe('shouldRequireBiometric', () => {
    describe('when enabled is true', () => {
      it('should return true when amount equals threshold', () => {
        const { setThreshold } = useBiometricThresholdStore.getState();

        setThreshold(100);

        const result =
          useBiometricThresholdStore.getState().shouldRequireBiometric(100);
        expect(result).toBe(true);
      });

      it('should return true when amount exceeds threshold', () => {
        const { setThreshold } = useBiometricThresholdStore.getState();

        setThreshold(100);

        const result =
          useBiometricThresholdStore.getState().shouldRequireBiometric(150);
        expect(result).toBe(true);
      });

      it('should return false when amount is below threshold', () => {
        const { setThreshold } = useBiometricThresholdStore.getState();

        setThreshold(100);

        const result =
          useBiometricThresholdStore.getState().shouldRequireBiometric(50);
        expect(result).toBe(false);
      });

      it('should always require biometric when threshold is 0', () => {
        // Default threshold is 0
        const state = useBiometricThresholdStore.getState();

        expect(state.shouldRequireBiometric(0)).toBe(true);
        expect(state.shouldRequireBiometric(0.01)).toBe(true);
        expect(state.shouldRequireBiometric(1000)).toBe(true);
      });

      it('should handle decimal amounts correctly', () => {
        const { setThreshold } = useBiometricThresholdStore.getState();

        setThreshold(99.99);

        const state = useBiometricThresholdStore.getState();

        expect(state.shouldRequireBiometric(99.98)).toBe(false);
        expect(state.shouldRequireBiometric(99.99)).toBe(true);
        expect(state.shouldRequireBiometric(100)).toBe(true);
      });
    });

    describe('when enabled is false', () => {
      beforeEach(() => {
        const { setEnabled } = useBiometricThresholdStore.getState();
        setEnabled(false);
      });

      it('should return false regardless of amount', () => {
        const state = useBiometricThresholdStore.getState();

        expect(state.shouldRequireBiometric(0)).toBe(false);
        expect(state.shouldRequireBiometric(100)).toBe(false);
        expect(state.shouldRequireBiometric(1_000_000)).toBe(false);
      });

      it('should return false even when threshold is 0', () => {
        const { setThreshold } = useBiometricThresholdStore.getState();

        setThreshold(0);

        const state = useBiometricThresholdStore.getState();
        expect(state.shouldRequireBiometric(1000)).toBe(false);
      });

      it('should return false for any configured threshold', () => {
        const { setThreshold } = useBiometricThresholdStore.getState();

        setThreshold(50);

        const state = useBiometricThresholdStore.getState();

        // Even though amount exceeds threshold, biometric is disabled
        expect(state.shouldRequireBiometric(100)).toBe(false);
      });
    });
  });

  // ── State Isolation ──────────────────────────────────────────────────────

  describe('state isolation', () => {
    it('should maintain independent threshold and enabled states', () => {
      const { setThreshold, setEnabled } = useBiometricThresholdStore.getState();

      setThreshold(500);
      setEnabled(false);

      const state = useBiometricThresholdStore.getState();
      expect(state.thresholdUsd).toBe(500);
      expect(state.enabled).toBe(false);

      // Changing threshold should not affect enabled
      useBiometricThresholdStore.getState().setThreshold(1000);

      const newState = useBiometricThresholdStore.getState();
      expect(newState.thresholdUsd).toBe(1000);
      expect(newState.enabled).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// useBiometricThreshold Hook Tests
// ---------------------------------------------------------------------------

describe('useBiometricThreshold', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should return all expected properties', () => {
    // Test the store selector behavior directly
    const state = useBiometricThresholdStore.getState();

    expect(typeof state.thresholdUsd).toBe('number');
    expect(typeof state.enabled).toBe('boolean');
    expect(typeof state.setThreshold).toBe('function');
    expect(typeof state.setEnabled).toBe('function');
    expect(typeof state.shouldRequireBiometric).toBe('function');
  });

  it('should provide working setThreshold action', () => {
    const { setThreshold } = useBiometricThresholdStore.getState();

    setThreshold(250);

    expect(useBiometricThresholdStore.getState().thresholdUsd).toBe(250);
  });

  it('should provide working setEnabled action', () => {
    const { setEnabled } = useBiometricThresholdStore.getState();

    setEnabled(false);

    expect(useBiometricThresholdStore.getState().enabled).toBe(false);
  });

  it('should provide working shouldRequireBiometric function', () => {
    const { setThreshold, setEnabled } = useBiometricThresholdStore.getState();

    setThreshold(100);
    setEnabled(true);

    // Need to get fresh reference after state update
    const currentShouldRequire =
      useBiometricThresholdStore.getState().shouldRequireBiometric;

    expect(currentShouldRequire(50)).toBe(false);
    expect(currentShouldRequire(100)).toBe(true);
    expect(currentShouldRequire(150)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resetBiometricThresholdStore Tests
// ---------------------------------------------------------------------------

describe('resetBiometricThresholdStore', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('should reset store to default values', () => {
    const { setThreshold, setEnabled } = useBiometricThresholdStore.getState();

    // Modify state
    setThreshold(999);
    setEnabled(false);

    expect(useBiometricThresholdStore.getState().thresholdUsd).toBe(999);
    expect(useBiometricThresholdStore.getState().enabled).toBe(false);

    // Reset
    resetBiometricThresholdStore();

    // Verify defaults restored
    expect(useBiometricThresholdStore.getState().thresholdUsd).toBe(0);
    expect(useBiometricThresholdStore.getState().enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases and Boundary Conditions
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should handle zero amount with positive threshold', () => {
    const { setThreshold } = useBiometricThresholdStore.getState();

    setThreshold(100);

    const state = useBiometricThresholdStore.getState();
    expect(state.shouldRequireBiometric(0)).toBe(false);
  });

  it('should handle very small amounts', () => {
    const { setThreshold } = useBiometricThresholdStore.getState();

    setThreshold(0.001);

    const state = useBiometricThresholdStore.getState();
    expect(state.shouldRequireBiometric(0.0001)).toBe(false);
    expect(state.shouldRequireBiometric(0.001)).toBe(true);
    expect(state.shouldRequireBiometric(0.01)).toBe(true);
  });

  it('should handle rapid state changes', () => {
    for (let i = 0; i < 100; i++) {
      useBiometricThresholdStore.getState().setThreshold(i);
      useBiometricThresholdStore.getState().setEnabled(i % 2 === 0);
    }

    const state = useBiometricThresholdStore.getState();
    expect(state.thresholdUsd).toBe(99);
    expect(state.enabled).toBe(false); // 99 % 2 = 1, so false
  });
});
