/**
 * Unit tests for CrossmintJwtBridge.
 *
 * Validates that the bridge correctly retrieves the Supabase JWT from
 * ISecureStorage and returns domain Result types, handling all edge cases
 * including missing tokens and storage failures.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { success, failure } from '@domain/common/types';
import { DomainError } from '@domain/common/errors/domain-error';
import type { ISecureStorage } from '@domain/common/ports/secure-storage';

// ---------------------------------------------------------------------------
// Mock factory — matches the ACTUAL ISecureStorage interface (Result types)
// ---------------------------------------------------------------------------

function createMockSecureStorage(): ISecureStorage {
  return {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
    clearAll: vi.fn(),
    setItemBiometric: vi.fn(),
    getItemBiometric: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CrossmintJwtBridge', () => {
  let storage: ISecureStorage;

  beforeEach(() => {
    storage = createMockSecureStorage();
  });

  it('should return a valid JWT when access_token exists in storage', async () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fake';
    vi.mocked(storage.getItem).mockResolvedValue(success(fakeJwt));

    const { CrossmintJwtBridge } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const bridge = new CrossmintJwtBridge(storage);
    const result = await bridge.getJwt();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(fakeJwt);
    }
    expect(storage.getItem).toHaveBeenCalledWith('access_token');
  });

  it('should return failure when access_token is null (user not logged in)', async () => {
    vi.mocked(storage.getItem).mockResolvedValue(success(null));

    const { CrossmintJwtBridge } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const bridge = new CrossmintJwtBridge(storage);
    const result = await bridge.getJwt();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error.code).toBe('JWT_NOT_FOUND');
    }
  });

  it('should return failure when storage itself returns an error', async () => {
    vi.mocked(storage.getItem).mockResolvedValue(
      failure(new DomainError('SecureStore unavailable', 'STORAGE_ERROR')),
    );

    const { CrossmintJwtBridge } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const bridge = new CrossmintJwtBridge(storage);
    const result = await bridge.getJwt();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error.code).toBe('STORAGE_ERROR');
    }
  });

  it('should return failure when an unexpected exception is thrown', async () => {
    vi.mocked(storage.getItem).mockRejectedValue(new Error('device exploded'));

    const { CrossmintJwtBridge } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const bridge = new CrossmintJwtBridge(storage);
    const result = await bridge.getJwt();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error.message).toContain('device exploded');
    }
  });

  it('should use the correct storage key', async () => {
    vi.mocked(storage.getItem).mockResolvedValue(success('some-token'));

    const { CrossmintJwtBridge } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const bridge = new CrossmintJwtBridge(storage);
    await bridge.getJwt();

    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(storage.getItem).toHaveBeenCalledWith('access_token');
  });

  it('should allow clearing the cached JWT', async () => {
    vi.mocked(storage.removeItem).mockResolvedValue(success(undefined));

    const { CrossmintJwtBridge } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const bridge = new CrossmintJwtBridge(storage);
    const result = await bridge.clearJwt();

    expect(result.ok).toBe(true);
    expect(storage.removeItem).toHaveBeenCalledWith('access_token');
  });

  it('should propagate storage error on clearJwt failure', async () => {
    vi.mocked(storage.removeItem).mockResolvedValue(
      failure(new DomainError('Cannot delete', 'STORAGE_ERROR')),
    );

    const { CrossmintJwtBridge } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const bridge = new CrossmintJwtBridge(storage);
    const result = await bridge.clearJwt();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('STORAGE_ERROR');
    }
  });
});
