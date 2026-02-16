/**
 * Unit tests for address-validator.
 *
 * Comprehensive test suite for multi-chain address validation covering
 * EVM, Solana, Stellar, and Sui address formats.
 */

import { describe, it, expect } from 'vitest';

import {
  validateAddress,
  isSelfSend,
} from '@infrastructure/wallet/address-validator';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const VALID_EVM_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f84d2E';
const VALID_EVM_ADDRESS_LOWERCASE = '0x742d35cc6634c0532925a3b844bc9e7595f84d2e';
const VALID_EVM_ADDRESS_UPPERCASE = '0x742D35CC6634C0532925A3B844BC9E7595F84D2E';

const VALID_SOLANA_ADDRESS = '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK';
const VALID_SOLANA_ADDRESS_SHORT = 'So11111111111111111111111111111112'; // 34 chars (valid base58)

const VALID_STELLAR_G_ADDRESS = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';
const VALID_STELLAR_M_ADDRESS = 'MAQAA5L65LSYH7CQ3VTJ7F3HHLGCL3DSLAR2Y47263D56MNNGHSQSAAAAAAAAAAE2LP26';

const VALID_SUI_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000002';

// ---------------------------------------------------------------------------
// EVM Address Tests
// ---------------------------------------------------------------------------

describe('validateAddress - EVM', () => {
  it('should validate a correct EVM address with mixed case (checksummed)', () => {
    const result = validateAddress(VALID_EVM_ADDRESS, 'evm');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
      expect(result.value.chain).toBe('evm');
      expect(result.value.normalized).toBe(VALID_EVM_ADDRESS_LOWERCASE);
      expect(result.value.checksumValid).toBe(true);
    }
  });

  it('should validate a lowercase EVM address', () => {
    const result = validateAddress(VALID_EVM_ADDRESS_LOWERCASE, 'evm');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
      expect(result.value.normalized).toBe(VALID_EVM_ADDRESS_LOWERCASE);
      expect(result.value.checksumValid).toBe(true);
    }
  });

  it('should validate an uppercase EVM address', () => {
    const result = validateAddress(VALID_EVM_ADDRESS_UPPERCASE, 'evm');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
      expect(result.value.checksumValid).toBe(true);
    }
  });

  it('should reject EVM address without 0x prefix', () => {
    const addressWithoutPrefix = '742d35Cc6634C0532925a3b844Bc9e7595f84d2E';
    const result = validateAddress(addressWithoutPrefix, 'evm');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('missing 0x prefix');
    }
  });

  it('should reject EVM address with wrong length (too short)', () => {
    const shortAddress = '0x742d35Cc6634C0532925a3b844Bc9e75';
    const result = validateAddress(shortAddress, 'evm');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('expected 42 characters');
    }
  });

  it('should reject EVM address with wrong length (too long)', () => {
    const longAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f84d2E00';
    const result = validateAddress(longAddress, 'evm');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('expected 42 characters');
    }
  });

  it('should reject EVM address with non-hex characters', () => {
    const invalidHexAddress = '0x742d35Gg6634C0532925a3b844Bc9e7595f84d2E';
    const result = validateAddress(invalidHexAddress, 'evm');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('non-hexadecimal characters');
    }
  });

  it('should accept 0X prefix (uppercase)', () => {
    const upperPrefixAddress = '0X742d35cc6634c0532925a3b844bc9e7595f84d2e';
    const result = validateAddress(upperPrefixAddress, 'evm');

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Solana Address Tests
// ---------------------------------------------------------------------------

describe('validateAddress - Solana', () => {
  it('should validate a correct Solana address', () => {
    const result = validateAddress(VALID_SOLANA_ADDRESS, 'solana');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
      expect(result.value.chain).toBe('solana');
      expect(result.value.normalized).toBe(VALID_SOLANA_ADDRESS);
      // Solana addresses do not have checksums
      expect(result.value.checksumValid).toBeUndefined();
    }
  });

  it('should validate a 32-character Solana address', () => {
    const result = validateAddress(VALID_SOLANA_ADDRESS_SHORT, 'solana');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
    }
  });

  it('should reject Solana address with invalid character 0 (zero)', () => {
    const invalidAddress = '0EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK';
    const result = validateAddress(invalidAddress, 'solana');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("invalid character '0'");
      expect(result.error.message).toContain('Base58 excludes 0, O, I, l');
    }
  });

  it('should reject Solana address with invalid character O (uppercase O)', () => {
    const invalidAddress = 'OEqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK';
    const result = validateAddress(invalidAddress, 'solana');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("invalid character 'O'");
    }
  });

  it('should reject Solana address with invalid character I (uppercase I)', () => {
    const invalidAddress = 'IEqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK';
    const result = validateAddress(invalidAddress, 'solana');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("invalid character 'I'");
    }
  });

  it('should reject Solana address with invalid character l (lowercase L)', () => {
    const invalidAddress = 'lEqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK';
    const result = validateAddress(invalidAddress, 'solana');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("invalid character 'l'");
    }
  });

  it('should reject Solana address that is too short', () => {
    const shortAddress = '7EqQdEULxWcraVx3mXKFjc84LhCkMG'; // 31 chars
    const result = validateAddress(shortAddress, 'solana');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('expected 32-44 characters');
    }
  });

  it('should reject Solana address that is too long', () => {
    const longAddress = '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeKABCDE'; // 49 chars
    const result = validateAddress(longAddress, 'solana');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('expected 32-44 characters');
    }
  });
});

// ---------------------------------------------------------------------------
// Stellar Address Tests
// ---------------------------------------------------------------------------

describe('validateAddress - Stellar', () => {
  it('should validate a correct Stellar G-address (public key)', () => {
    const result = validateAddress(VALID_STELLAR_G_ADDRESS, 'stellar');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
      expect(result.value.chain).toBe('stellar');
      expect(result.value.normalized).toBe(VALID_STELLAR_G_ADDRESS);
    }
  });

  it('should validate a correct Stellar M-address (muxed account)', () => {
    const result = validateAddress(VALID_STELLAR_M_ADDRESS, 'stellar');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
      expect(result.value.chain).toBe('stellar');
      expect(result.value.normalized).toBe(VALID_STELLAR_M_ADDRESS);
    }
  });

  it('should reject Stellar address with invalid prefix', () => {
    const invalidPrefix = 'SBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';
    const result = validateAddress(invalidPrefix, 'stellar');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("must start with 'G' (public key) or 'M' (muxed account)");
    }
  });

  it('should reject Stellar G-address with wrong length', () => {
    const wrongLength = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDN'; // 55 chars
    const result = validateAddress(wrongLength, 'stellar');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('G-address expected 56 characters');
    }
  });

  it('should reject Stellar M-address with wrong length', () => {
    const wrongLength = 'MAQAA5L65LSYH7CQ3VTJ7F3HHLGCL3DSLAR2Y47263D56MNNGHSQSAAAAAAAAAE2LP26'; // 68 chars
    const result = validateAddress(wrongLength, 'stellar');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('M-address expected 69 characters');
    }
  });

  it('should reject Stellar address with lowercase characters', () => {
    const lowercaseAddress = 'gbzxn7pirzgnmhga7muuuf4gwpy5aypv6ly4uv2gl6vjgiqrxfdnmadi';
    const result = validateAddress(lowercaseAddress, 'stellar');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Lowercase 'g' is caught by prefix check first
      expect(result.error.message).toContain("must start with 'G'");
    }
  });

  it('should reject Stellar address with invalid digit (0, 1, 8, 9)', () => {
    const invalidDigit = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMAD1';
    const result = validateAddress(invalidDigit, 'stellar');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('must contain only uppercase A-Z and digits 2-7');
    }
  });
});

// ---------------------------------------------------------------------------
// Sui Address Tests
// ---------------------------------------------------------------------------

describe('validateAddress - Sui', () => {
  it('should validate a correct Sui address', () => {
    const result = validateAddress(VALID_SUI_ADDRESS, 'sui');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
      expect(result.value.chain).toBe('sui');
      expect(result.value.normalized).toBe(VALID_SUI_ADDRESS.toLowerCase());
    }
  });

  it('should validate Sui address with uppercase hex', () => {
    const upperAddress = '0x0000000000000000000000000000000000000000000000000000000000000002'.toUpperCase();
    const result = validateAddress(upperAddress, 'sui');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.normalized).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      );
    }
  });

  it('should reject Sui address without 0x prefix', () => {
    const noPrefix = '0000000000000000000000000000000000000000000000000000000000000002';
    const result = validateAddress(noPrefix, 'sui');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('missing 0x prefix');
    }
  });

  it('should reject Sui address with wrong length (too short)', () => {
    const shortAddress = '0x000000000000000000000000000000000000000000000000000000000002';
    const result = validateAddress(shortAddress, 'sui');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('expected 66 characters');
    }
  });

  it('should reject Sui address with wrong length (too long)', () => {
    const longAddress = '0x000000000000000000000000000000000000000000000000000000000000000002';
    const result = validateAddress(longAddress, 'sui');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('expected 66 characters');
    }
  });

  it('should reject Sui address with non-hex characters', () => {
    const invalidHex = '0x000000000000000000000000000000000000000000000000000000000000000G';
    const result = validateAddress(invalidHex, 'sui');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('non-hexadecimal characters');
    }
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('validateAddress - Edge Cases', () => {
  it('should reject empty string', () => {
    const result = validateAddress('', 'evm');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('non-empty string');
    }
  });

  it('should reject whitespace-only string', () => {
    const result = validateAddress('   ', 'evm');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('cannot be empty');
    }
  });

  it('should handle address with leading/trailing whitespace', () => {
    const result = validateAddress(`  ${VALID_EVM_ADDRESS}  `, 'evm');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isValid).toBe(true);
    }
  });

  it('should reject null-ish values coerced to string', () => {
    // TypeScript would prevent this, but runtime might receive unexpected values
    const result = validateAddress(null as unknown as string, 'evm');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('must be a non-empty string');
    }
  });

  it('should reject undefined coerced to string', () => {
    const result = validateAddress(undefined as unknown as string, 'evm');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('must be a non-empty string');
    }
  });
});

// ---------------------------------------------------------------------------
// isSelfSend Tests
// ---------------------------------------------------------------------------

describe('isSelfSend', () => {
  it('should return true when address matches one of own addresses (exact match)', () => {
    const ownAddresses = [VALID_EVM_ADDRESS];
    const result = isSelfSend(VALID_EVM_ADDRESS, ownAddresses);

    expect(result).toBe(true);
  });

  it('should return true when address matches with different case', () => {
    const ownAddresses = [VALID_EVM_ADDRESS_LOWERCASE];
    const result = isSelfSend(VALID_EVM_ADDRESS_UPPERCASE, ownAddresses);

    expect(result).toBe(true);
  });

  it('should return true when address matches any address in the array', () => {
    const ownAddresses = [
      '0x1111111111111111111111111111111111111111',
      VALID_EVM_ADDRESS,
      '0x2222222222222222222222222222222222222222',
    ];
    const result = isSelfSend(VALID_EVM_ADDRESS_LOWERCASE, ownAddresses);

    expect(result).toBe(true);
  });

  it('should return false when address does not match any own addresses', () => {
    const ownAddresses = [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ];
    const result = isSelfSend(VALID_EVM_ADDRESS, ownAddresses);

    expect(result).toBe(false);
  });

  it('should return false for empty own addresses array', () => {
    const result = isSelfSend(VALID_EVM_ADDRESS, []);

    expect(result).toBe(false);
  });

  it('should return false for empty address input', () => {
    const ownAddresses = [VALID_EVM_ADDRESS];
    const result = isSelfSend('', ownAddresses);

    expect(result).toBe(false);
  });

  it('should handle addresses with whitespace', () => {
    const ownAddresses = [`  ${VALID_EVM_ADDRESS}  `];
    const result = isSelfSend(VALID_EVM_ADDRESS, ownAddresses);

    expect(result).toBe(true);
  });

  it('should work with Solana addresses', () => {
    const ownAddresses = [VALID_SOLANA_ADDRESS];
    const result = isSelfSend(VALID_SOLANA_ADDRESS, ownAddresses);

    expect(result).toBe(true);
  });

  it('should work with Stellar addresses (case-sensitive comparison lowercased)', () => {
    const ownAddresses = [VALID_STELLAR_G_ADDRESS];
    // Stellar addresses are uppercase, but lowercase comparison still works
    const result = isSelfSend(VALID_STELLAR_G_ADDRESS.toLowerCase(), ownAddresses);

    expect(result).toBe(true);
  });
});
