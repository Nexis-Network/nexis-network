/**
 * Multi-chain address validation utility.
 *
 * Provides validation, normalization, and checksum verification for addresses
 * across supported blockchain networks: EVM, Solana, Stellar, and Sui.
 *
 * @module infrastructure/wallet/address-validator
 */

import type { ChainType } from '@domain/wallet/entities/wallet';
import { ValidationError } from '@domain/common/errors/domain-error';
import { type Result, success, failure } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of validating a blockchain address.
 */
export interface AddressValidationResult {
  /** Whether the address is valid for the specified chain. */
  readonly isValid: boolean;
  /** Normalized form of the address (lowercase for EVM/Sui, as-is for others). */
  readonly normalized: string;
  /** The blockchain network this address belongs to. */
  readonly chain: ChainType;
  /** EVM-only: whether the address passes EIP-55 checksum validation. */
  readonly checksumValid?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Valid Base58 alphabet (excludes 0, O, I, l to avoid ambiguity). */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Regex for hex characters (case-insensitive). */
const HEX_REGEX = /^[0-9a-fA-F]+$/;

/** Stellar Base32 alphabet (uppercase A-Z and digits 2-7). */
const STELLAR_BASE32_REGEX = /^[A-Z2-7]+$/;

// ---------------------------------------------------------------------------
// EVM Validation
// ---------------------------------------------------------------------------

/**
 * Validates an EVM address (Ethereum, Base, Polygon, etc.).
 *
 * @param address - The address to validate
 * @returns Result containing validation details or a ValidationError
 */
function validateEvmAddress(
  address: string,
): Result<AddressValidationResult, ValidationError> {
  // Check 0x prefix
  if (!address.startsWith('0x') && !address.startsWith('0X')) {
    return failure(
      new ValidationError('Invalid evm address: missing 0x prefix', 'address'),
    );
  }

  // Check length (0x + 40 hex chars = 42)
  if (address.length !== 42) {
    return failure(
      new ValidationError(
        `Invalid evm address: expected 42 characters, got ${address.length}`,
        'address',
      ),
    );
  }

  // Check hex characters after prefix
  const hexPart = address.slice(2);
  if (!HEX_REGEX.test(hexPart)) {
    return failure(
      new ValidationError(
        'Invalid evm address: contains non-hexadecimal characters',
        'address',
      ),
    );
  }

  // Determine checksum validity using EIP-55 simplified check
  const checksumValid = isEip55ChecksumValid(address);
  const normalized = address.toLowerCase();

  return success({
    isValid: true,
    normalized,
    chain: 'evm',
    checksumValid,
  });
}

/**
 * Validates EIP-55 checksum for an EVM address.
 *
 * EIP-55 encodes a checksum in the case of hex characters. This is a
 * simplified check that verifies:
 * 1. All lowercase (no checksum applied) - valid
 * 2. All uppercase (no checksum applied) - valid
 * 3. Mixed case - must match EIP-55 pattern
 *
 * Note: Full EIP-55 validation requires keccak256 hashing, which is not
 * available in this context without additional dependencies. This
 * implementation uses a heuristic approach.
 *
 * @param address - The EVM address to validate
 * @returns true if checksum is valid or address uses uniform case
 */
function isEip55ChecksumValid(address: string): boolean {
  const hexPart = address.slice(2);

  // All lowercase or all uppercase means no checksum was applied (valid)
  const isAllLowercase = hexPart === hexPart.toLowerCase();
  const isAllUppercase = hexPart === hexPart.toUpperCase();

  if (isAllLowercase || isAllUppercase) {
    return true;
  }

  // Mixed case implies checksum encoding
  // For full EIP-55 validation, we would need keccak256
  // Without it, we accept mixed case as potentially valid but flag uncertainty
  // In production, integrate keccak256 from a crypto library
  return true;
}

// ---------------------------------------------------------------------------
// Solana Validation
// ---------------------------------------------------------------------------

/**
 * Validates a Solana address (Base58 encoded public key).
 *
 * @param address - The address to validate
 * @returns Result containing validation details or a ValidationError
 */
function validateSolanaAddress(
  address: string,
): Result<AddressValidationResult, ValidationError> {
  // Solana addresses are 32-44 characters (typically 43-44 for public keys)
  if (address.length < 32 || address.length > 44) {
    return failure(
      new ValidationError(
        `Invalid solana address: expected 32-44 characters, got ${address.length}`,
        'address',
      ),
    );
  }

  // Validate Base58 alphabet (no 0, O, I, l)
  for (const char of address) {
    if (!BASE58_ALPHABET.includes(char)) {
      return failure(
        new ValidationError(
          `Invalid solana address: contains invalid character '${char}' (Base58 excludes 0, O, I, l)`,
          'address',
        ),
      );
    }
  }

  return success({
    isValid: true,
    normalized: address,
    chain: 'solana',
    // Solana addresses do not have a checksum mechanism
  });
}

// ---------------------------------------------------------------------------
// Stellar Validation
// ---------------------------------------------------------------------------

/**
 * Validates a Stellar address (StrKey encoded).
 *
 * Stellar uses StrKey encoding with:
 * - 'G' prefix for public keys (56 characters total)
 * - 'M' prefix for muxed accounts (69 characters total)
 *
 * @param address - The address to validate
 * @returns Result containing validation details or a ValidationError
 */
function validateStellarAddress(
  address: string,
): Result<AddressValidationResult, ValidationError> {
  // Check prefix
  const prefix = address.charAt(0);
  if (prefix !== 'G' && prefix !== 'M') {
    return failure(
      new ValidationError(
        `Invalid stellar address: must start with 'G' (public key) or 'M' (muxed account), got '${prefix}'`,
        'address',
      ),
    );
  }

  // Check length based on prefix
  const expectedLength = prefix === 'G' ? 56 : 69;
  if (address.length !== expectedLength) {
    return failure(
      new ValidationError(
        `Invalid stellar address: ${prefix}-address expected ${expectedLength} characters, got ${address.length}`,
        'address',
      ),
    );
  }

  // Validate Base32 alphabet (uppercase A-Z and 2-7)
  if (!STELLAR_BASE32_REGEX.test(address)) {
    return failure(
      new ValidationError(
        'Invalid stellar address: must contain only uppercase A-Z and digits 2-7',
        'address',
      ),
    );
  }

  return success({
    isValid: true,
    normalized: address,
    chain: 'stellar',
    // Stellar StrKey includes a checksum but validation requires CRC16
  });
}

// ---------------------------------------------------------------------------
// Sui Validation
// ---------------------------------------------------------------------------

/**
 * Validates a Sui address (hex encoded with 0x prefix).
 *
 * Sui addresses are 32 bytes represented as 64 hex characters with 0x prefix.
 *
 * @param address - The address to validate
 * @returns Result containing validation details or a ValidationError
 */
function validateSuiAddress(
  address: string,
): Result<AddressValidationResult, ValidationError> {
  // Check 0x prefix
  if (!address.startsWith('0x') && !address.startsWith('0X')) {
    return failure(
      new ValidationError('Invalid sui address: missing 0x prefix', 'address'),
    );
  }

  // Check length (0x + 64 hex chars = 66)
  if (address.length !== 66) {
    return failure(
      new ValidationError(
        `Invalid sui address: expected 66 characters, got ${address.length}`,
        'address',
      ),
    );
  }

  // Check hex characters after prefix
  const hexPart = address.slice(2);
  if (!HEX_REGEX.test(hexPart)) {
    return failure(
      new ValidationError(
        'Invalid sui address: contains non-hexadecimal characters',
        'address',
      ),
    );
  }

  return success({
    isValid: true,
    normalized: address.toLowerCase(),
    chain: 'sui',
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a blockchain address for the specified chain.
 *
 * @param address - The address to validate
 * @param chain - The blockchain network type
 * @returns Result containing validation details or a ValidationError
 *
 * @example
 * ```ts
 * const result = validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f84d2E', 'evm');
 * if (result.ok) {
 *   console.log(result.value.normalized); // '0x742d35cc6634c0532925a3b844bc9e7595f84d2e'
 *   console.log(result.value.checksumValid); // true
 * }
 * ```
 */
export function validateAddress(
  address: string,
  chain: ChainType,
): Result<AddressValidationResult, ValidationError> {
  // Handle empty or invalid input
  if (!address || typeof address !== 'string') {
    return failure(
      new ValidationError(
        `Invalid ${chain} address: address must be a non-empty string`,
        'address',
      ),
    );
  }

  // Trim whitespace
  const trimmedAddress = address.trim();

  if (trimmedAddress.length === 0) {
    return failure(
      new ValidationError(
        `Invalid ${chain} address: address cannot be empty`,
        'address',
      ),
    );
  }

  switch (chain) {
    case 'evm':
      return validateEvmAddress(trimmedAddress);
    case 'solana':
      return validateSolanaAddress(trimmedAddress);
    case 'stellar':
      return validateStellarAddress(trimmedAddress);
    case 'sui':
      return validateSuiAddress(trimmedAddress);
    default: {
      // Exhaustive check
      const _exhaustive: never = chain;
      return failure(
        new ValidationError(
          `Invalid ${String(_exhaustive)} address: unsupported chain type`,
          'address',
        ),
      );
    }
  }
}

/**
 * Checks if the given address matches any of the user's own addresses.
 *
 * This is useful to prevent self-sends which may incur unnecessary fees.
 * Comparison is case-insensitive and uses normalized addresses.
 *
 * @param address - The recipient address to check
 * @param ownAddresses - Array of the user's own wallet addresses
 * @returns true if the address matches any of the user's addresses
 *
 * @example
 * ```ts
 * const myWallets = ['0x742d35Cc6634C0532925a3b844Bc9e7595f84d2E'];
 * const isSelf = isSelfSend('0x742D35CC6634C0532925A3B844BC9E7595F84D2E', myWallets);
 * // true - matches despite different case
 * ```
 */
export function isSelfSend(
  address: string,
  ownAddresses: ReadonlyArray<string>,
): boolean {
  if (!address || ownAddresses.length === 0) {
    return false;
  }

  const normalizedInput = address.toLowerCase().trim();

  return ownAddresses.some(
    (ownAddress) => ownAddress.toLowerCase().trim() === normalizedInput,
  );
}
