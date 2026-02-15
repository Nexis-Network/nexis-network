/**
 * Domain Layer Unit Tests - Wallet Module
 *
 * Tests for TokenAmount value object, Wallet entity, and Transaction entity.
 * Pure TypeScript tests with comprehensive coverage of financial calculations.
 */

import { describe, it, expect } from 'vitest';
import { TokenAmount } from '@domain/wallet/value-objects/token-amount';
import type { Wallet, TokenBalance, Transaction } from '@domain/wallet/entities/wallet';
import { ValidationError } from '@domain/common/errors/domain-error';
import type { Timestamp, UUID } from '@domain/common/types';

// =============================================================================
// TokenAmount Value Object Tests
// =============================================================================

describe('TokenAmount', () => {
  describe('fromRaw', () => {
    it('should create TokenAmount from raw bigint value', () => {
      const amount = TokenAmount.fromRaw(1000000000000000000n, 18, 'ETH');
      expect(amount.raw).toBe(1000000000000000000n);
      expect(amount.decimals).toBe(18);
      expect(amount.symbol).toBe('ETH');
    });

    it('should create TokenAmount with zero value', () => {
      const amount = TokenAmount.fromRaw(0n, 18, 'ETH');
      expect(amount.raw).toBe(0n);
      expect(amount.isZero()).toBe(true);
    });

    it('should throw ValidationError for invalid decimals (negative)', () => {
      expect(() => TokenAmount.fromRaw(1000n, -1, 'ETH')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid decimals (exceeds 77)', () => {
      expect(() => TokenAmount.fromRaw(1000n, 78, 'ETH')).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-integer decimals', () => {
      expect(() => TokenAmount.fromRaw(1000n, 18.5, 'ETH')).toThrow(ValidationError);
    });

    it('should accept decimals at boundary (77)', () => {
      const amount = TokenAmount.fromRaw(1000n, 77, 'CUSTOM');
      expect(amount.decimals).toBe(77);
    });

    it('should accept decimals at boundary (0)', () => {
      const amount = TokenAmount.fromRaw(1000n, 0, 'WBTC');
      expect(amount.decimals).toBe(0);
    });
  });

  describe('fromDecimal', () => {
    it('should create TokenAmount from decimal string', () => {
      const amount = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      expect(amount.formatted).toBe('1.5');
      expect(amount.symbol).toBe('ETH');
    });

    it('should create TokenAmount from integer string', () => {
      const amount = TokenAmount.fromDecimal('10', 18, 'ETH');
      expect(amount.formatted).toBe('10');
    });

    it('should create TokenAmount with many decimal places', () => {
      const amount = TokenAmount.fromDecimal('1.123456789012345678', 18, 'ETH');
      expect(amount.formatted).toBe('1.123456789012345678');
    });

    it('should create TokenAmount with trailing zeros trimmed', () => {
      const amount = TokenAmount.fromDecimal('1.50000', 18, 'ETH');
      expect(amount.formatted).toBe('1.5');
    });

    it('should handle decimal precision exceeding token decimals (truncate)', () => {
      const amount = TokenAmount.fromDecimal('1.123456789', 6, 'USDC');
      // Should truncate to 6 decimals
      expect(amount.formatted).toBe('1.123456');
    });

    it('should handle zero value', () => {
      const amount = TokenAmount.fromDecimal('0', 18, 'ETH');
      expect(amount.isZero()).toBe(true);
      expect(amount.formatted).toBe('0');
    });

    it('should handle zero with decimals', () => {
      const amount = TokenAmount.fromDecimal('0.000', 18, 'ETH');
      expect(amount.isZero()).toBe(true);
    });

    it('should trim whitespace from input', () => {
      const amount = TokenAmount.fromDecimal('  1.5  ', 18, 'ETH');
      expect(amount.formatted).toBe('1.5');
    });

    it('should throw ValidationError for empty string', () => {
      expect(() => TokenAmount.fromDecimal('', 18, 'ETH')).toThrow(ValidationError);
      expect(() => TokenAmount.fromDecimal('', 18, 'ETH')).toThrow('must not be empty');
    });

    it('should throw ValidationError for whitespace only', () => {
      expect(() => TokenAmount.fromDecimal('   ', 18, 'ETH')).toThrow(ValidationError);
    });

    it('should throw ValidationError for multiple decimal points', () => {
      expect(() => TokenAmount.fromDecimal('1.5.3', 18, 'ETH')).toThrow(ValidationError);
      expect(() => TokenAmount.fromDecimal('1.5.3', 18, 'ETH')).toThrow('Invalid decimal format');
    });

    it('should throw ValidationError for non-numeric input', () => {
      expect(() => TokenAmount.fromDecimal('abc', 18, 'ETH')).toThrow();
    });

    it('should handle very large numbers', () => {
      const amount = TokenAmount.fromDecimal('1000000000', 18, 'ETH');
      expect(amount.formatted).toBe('1000000000');
    });

    it('should handle very small numbers', () => {
      const amount = TokenAmount.fromDecimal('0.000000000000000001', 18, 'ETH');
      expect(amount.formatted).toBe('0.000000000000000001');
    });
  });

  describe('formatted', () => {
    it('should format integer value without decimals', () => {
      const amount = TokenAmount.fromRaw(1000000000000000000n, 18, 'ETH');
      expect(amount.formatted).toBe('1');
    });

    it('should format decimal value with trailing zeros trimmed', () => {
      const amount = TokenAmount.fromRaw(1500000000000000000n, 18, 'ETH');
      expect(amount.formatted).toBe('1.5');
    });

    it('should format zero as "0"', () => {
      const amount = TokenAmount.fromRaw(0n, 18, 'ETH');
      expect(amount.formatted).toBe('0');
    });

    it('should format negative value', () => {
      const amount = TokenAmount.fromRaw(-1500000000000000000n, 18, 'ETH');
      expect(amount.formatted).toBe('-1.5');
    });

    it('should format value with all decimal places', () => {
      const amount = TokenAmount.fromRaw(1234567890123456789n, 18, 'ETH');
      expect(amount.formatted).toBe('1.234567890123456789');
    });

    it('should format value with high decimals (SOL)', () => {
      const amount = TokenAmount.fromRaw(1500000000n, 9, 'SOL');
      expect(amount.formatted).toBe('1.5');
    });

    it('should format value with low decimals (USDC)', () => {
      const amount = TokenAmount.fromRaw(1500000n, 6, 'USDC');
      expect(amount.formatted).toBe('1.5');
    });

    it('should format value with zero decimals', () => {
      const amount = TokenAmount.fromRaw(100n, 0, 'WBTC');
      expect(amount.formatted).toBe('100');
    });
  });

  describe('display', () => {
    it('should include token symbol', () => {
      const amount = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      expect(amount.display).toBe('1.5 ETH');
    });

    it('should format zero with symbol', () => {
      const amount = TokenAmount.fromRaw(0n, 18, 'ETH');
      expect(amount.display).toBe('0 ETH');
    });

    it('should format negative value with symbol', () => {
      const amount = TokenAmount.fromRaw(-1500000000000000000n, 18, 'ETH');
      expect(amount.display).toBe('-1.5 ETH');
    });
  });

  describe('add', () => {
    it('should add two positive amounts', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      const result = a.add(b);
      expect(result.formatted).toBe('2');
    });

    it('should add zero to amount', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromRaw(0n, 18, 'ETH');
      const result = a.add(b);
      expect(result.formatted).toBe('1.5');
    });

    it('should add negative amount', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromRaw(-500000000000000000n, 18, 'ETH');
      const result = a.add(b);
      expect(result.formatted).toBe('1');
    });

    it('should throw ValidationError when adding different tokens', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'USDC');
      expect(() => a.add(b)).toThrow(ValidationError);
      expect(() => a.add(b)).toThrow('Cannot perform arithmetic on different tokens');
    });

    it('should throw ValidationError when decimals differ', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 6, 'ETH');
      expect(() => a.add(b)).toThrow(ValidationError);
    });

    it('should preserve immutability (original unchanged)', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      a.add(b);
      expect(a.formatted).toBe('1.5'); // Original unchanged
    });
  });

  describe('subtract', () => {
    it('should subtract two positive amounts', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      const result = a.subtract(b);
      expect(result.formatted).toBe('1');
    });

    it('should subtract resulting in zero', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const result = a.subtract(b);
      expect(result.isZero()).toBe(true);
    });

    it('should subtract resulting in negative', () => {
      const a = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const result = a.subtract(b);
      expect(result.formatted).toBe('-1');
    });

    it('should throw ValidationError when subtracting different tokens', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'USDC');
      expect(() => a.subtract(b)).toThrow(ValidationError);
    });

    it('should preserve immutability', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      a.subtract(b);
      expect(a.formatted).toBe('1.5');
    });
  });

  describe('multiply', () => {
    it('should multiply by positive scalar', () => {
      const amount = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const result = amount.multiply(2n);
      expect(result.formatted).toBe('3');
    });

    it('should multiply by zero', () => {
      const amount = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const result = amount.multiply(0n);
      expect(result.isZero()).toBe(true);
    });

    it('should multiply by negative scalar', () => {
      const amount = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const result = amount.multiply(-2n);
      expect(result.formatted).toBe('-3');
    });

    it('should multiply resulting in large value', () => {
      const amount = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const result = amount.multiply(1000000n);
      expect(result.formatted).toBe('1500000');
    });

    it('should preserve immutability', () => {
      const amount = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      amount.multiply(2n);
      expect(amount.formatted).toBe('1.5');
    });
  });

  describe('isZero', () => {
    it('should return true for zero value', () => {
      const amount = TokenAmount.fromRaw(0n, 18, 'ETH');
      expect(amount.isZero()).toBe(true);
    });

    it('should return false for positive value', () => {
      const amount = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      expect(amount.isZero()).toBe(false);
    });

    it('should return false for negative value', () => {
      const amount = TokenAmount.fromRaw(-1n, 18, 'ETH');
      expect(amount.isZero()).toBe(false);
    });
  });

  describe('isGreaterThan', () => {
    it('should return true when first amount is greater', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      expect(a.isGreaterThan(b)).toBe(true);
    });

    it('should return false when amounts are equal', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      expect(a.isGreaterThan(b)).toBe(false);
    });

    it('should return false when first amount is less', () => {
      const a = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      expect(a.isGreaterThan(b)).toBe(false);
    });

    it('should throw ValidationError when comparing different tokens', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'USDC');
      expect(() => a.isGreaterThan(b)).toThrow(ValidationError);
    });
  });

  describe('isLessThan', () => {
    it('should return true when first amount is less', () => {
      const a = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      expect(a.isLessThan(b)).toBe(true);
    });

    it('should return false when amounts are equal', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      expect(a.isLessThan(b)).toBe(false);
    });

    it('should return false when first amount is greater', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('0.5', 18, 'ETH');
      expect(a.isLessThan(b)).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal amounts', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.6', 18, 'ETH');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different symbols', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 18, 'USDC');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different decimals', () => {
      const a = TokenAmount.fromDecimal('1.5', 18, 'ETH');
      const b = TokenAmount.fromDecimal('1.5', 6, 'ETH');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('formatRaw (static)', () => {
    it('should format raw value with correct decimals', () => {
      const formatted = TokenAmount.formatRaw(1500000000000000000n, 18);
      expect(formatted).toBe('1.5');
    });

    it('should format zero', () => {
      const formatted = TokenAmount.formatRaw(0n, 18);
      expect(formatted).toBe('0');
    });

    it('should format negative value', () => {
      const formatted = TokenAmount.formatRaw(-1500000000000000000n, 18);
      expect(formatted).toBe('-1.5');
    });

    it('should format with trailing zeros trimmed', () => {
      const formatted = TokenAmount.formatRaw(1000000000000000000n, 18);
      expect(formatted).toBe('1');
    });
  });
});

// =============================================================================
// Wallet Entity Tests
// =============================================================================

describe('Wallet Entity', () => {
  describe('structure', () => {
    it('should have all required fields', () => {
      const wallet: Wallet = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        chainType: 'evm',
        label: 'My Wallet',
        isPrimary: true,
        safeVersion: undefined,
        deploymentStatus: 'running',
        walletProvider: 'walletconnect',
      };

      expect(wallet.id).toBeDefined();
      expect(wallet.address).toBeDefined();
      expect(wallet.chainType).toBeDefined();
      expect(wallet.label).toBeDefined();
      expect(wallet.isPrimary).toBeDefined();
      expect(wallet.deploymentStatus).toBeDefined();
    });

    it('should support EVM chain type', () => {
      const wallet: Wallet = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        chainType: 'evm',
        label: 'My Wallet',
        isPrimary: true,
        safeVersion: undefined,
        deploymentStatus: 'running',
        walletProvider: 'walletconnect',
      };

      expect(wallet.chainType).toBe('evm');
    });

    it('should support Solana chain type', () => {
      const wallet: Wallet = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        address: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        chainType: 'solana',
        label: 'My Solana Wallet',
        isPrimary: true,
        safeVersion: undefined,
        deploymentStatus: 'running',
        walletProvider: 'walletconnect',
      };

      expect(wallet.chainType).toBe('solana');
    });

    it('should support Safe wallet with version', () => {
      const wallet: Wallet = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        chainType: 'evm',
        label: 'My Safe',
        isPrimary: true,
        safeVersion: '1.3.0',
        deploymentStatus: 'running',
        walletProvider: 'safe',
      };

      expect(wallet.safeVersion).toBe('1.3.0');
    });

    it('should support all deployment statuses', () => {
      const statuses: Array<'creating' | 'running' | 'stopped' | 'failed'> = [
        'creating',
        'running',
        'stopped',
        'failed',
      ];

      statuses.forEach((status) => {
        const wallet: Wallet = {
          id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          chainType: 'evm',
          label: 'Test',
          isPrimary: false,
          safeVersion: undefined,
          deploymentStatus: status,
          walletProvider: 'walletconnect',
        };

        expect(wallet.deploymentStatus).toBe(status);
      });
    });
  });
});

// =============================================================================
// TokenBalance Entity Tests
// =============================================================================

describe('TokenBalance Entity', () => {
  describe('structure', () => {
    it('should have all required fields', () => {
      const balance: TokenBalance = {
        tokenAddress: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '1.5',
        decimals: 18,
        usdValue: 3000.0,
        iconUrl: 'https://example.com/eth.png',
      };

      expect(balance.tokenAddress).toBeDefined();
      expect(balance.symbol).toBeDefined();
      expect(balance.name).toBeDefined();
      expect(balance.balance).toBeDefined();
      expect(balance.decimals).toBeDefined();
    });

    it('should allow undefined usdValue', () => {
      const balance: TokenBalance = {
        tokenAddress: '0x0000000000000000000000000000000000000000',
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        balance: '100',
        decimals: 18,
        usdValue: undefined,
        iconUrl: undefined,
      };

      expect(balance.usdValue).toBeUndefined();
    });

    it('should allow undefined iconUrl', () => {
      const balance: TokenBalance = {
        tokenAddress: '0x0000000000000000000000000000000000000000',
        symbol: 'CUSTOM',
        name: 'Custom Token',
        balance: '100',
        decimals: 18,
        usdValue: undefined,
        iconUrl: undefined,
      };

      expect(balance.iconUrl).toBeUndefined();
    });
  });
});

// =============================================================================
// Transaction Entity Tests
// =============================================================================

describe('Transaction Entity', () => {
  describe('structure', () => {
    it('should have all required fields', () => {
      const transaction: Transaction = {
        hash: '0x123abc...',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        to: '0x456def...',
        value: '1.5',
        gasUsed: '21000',
        status: 'confirmed',
        timestamp: 1707849600000 as Timestamp,
        chainId: 1,
      };

      expect(transaction.hash).toBeDefined();
      expect(transaction.from).toBeDefined();
      expect(transaction.to).toBeDefined();
      expect(transaction.value).toBeDefined();
      expect(transaction.status).toBeDefined();
      expect(transaction.timestamp).toBeDefined();
      expect(transaction.chainId).toBeDefined();
    });

    it('should allow undefined gasUsed', () => {
      const transaction: Transaction = {
        hash: '0x123abc...',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        to: '0x456def...',
        value: '1.5',
        gasUsed: undefined,
        status: 'pending',
        timestamp: 1707849600000 as Timestamp,
        chainId: 1,
      };

      expect(transaction.gasUsed).toBeUndefined();
    });

    it('should support all transaction statuses', () => {
      const statuses: Array<'pending' | 'confirmed' | 'failed'> = [
        'pending',
        'confirmed',
        'failed',
      ];

      statuses.forEach((status) => {
        const transaction: Transaction = {
          hash: '0x123abc...',
          from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          to: '0x456def...',
          value: '1.5',
          gasUsed: '21000',
          status,
          timestamp: 1707849600000 as Timestamp,
          chainId: 1,
        };

        expect(transaction.status).toBe(status);
      });
    });
  });
});
