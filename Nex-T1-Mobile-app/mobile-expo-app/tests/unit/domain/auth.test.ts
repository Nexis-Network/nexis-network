/**
 * Domain Layer Unit Tests - Authentication Module
 *
 * Tests for Email and WalletAddress value objects, User entity, and domain errors.
 * These are pure TypeScript tests with no external dependencies or mocking.
 */

import { describe, it, expect } from 'vitest';
import { EmailVO } from '@domain/auth/value-objects/email';
import { WalletAddressVO } from '@domain/auth/value-objects/wallet-address';
import type { User, Session } from '@domain/auth/entities/user';
import { ValidationError } from '@domain/common/errors/domain-error';
import type { Timestamp, UUID } from '@domain/common/types';

// =============================================================================
// Email Value Object Tests
// =============================================================================

describe('EmailVO', () => {
  describe('create', () => {
    describe('valid emails', () => {
      it('should create Email for standard email format', () => {
        const email = EmailVO.create('user@example.com');
        expect(email).toBe('user@example.com');
      });

      it('should create Email with subdomains', () => {
        const email = EmailVO.create('user@mail.example.com');
        expect(email).toBe('user@mail.example.com');
      });

      it('should create Email with plus addressing', () => {
        const email = EmailVO.create('user+tag@example.com');
        expect(email).toBe('user+tag@example.com');
      });

      it('should create Email with numbers in local part', () => {
        const email = EmailVO.create('user123@example.com');
        expect(email).toBe('user123@example.com');
      });

      it('should create Email with dots in local part', () => {
        const email = EmailVO.create('first.last@example.com');
        expect(email).toBe('first.last@example.com');
      });

      it('should create Email with hyphen in domain', () => {
        const email = EmailVO.create('user@my-domain.com');
        expect(email).toBe('user@my-domain.com');
      });

      it('should create Email with special characters in local part', () => {
        const email = EmailVO.create("user!#$%&'*+/=?^_`{|}~@example.com");
        expect(email).toBe("user!#$%&'*+/=?^_`{|}~@example.com");
      });
    });

    describe('normalization', () => {
      it('should convert email to lowercase', () => {
        const email = EmailVO.create('USER@EXAMPLE.COM');
        expect(email).toBe('user@example.com');
      });

      it('should trim whitespace from email', () => {
        const email = EmailVO.create('  user@example.com  ');
        expect(email).toBe('user@example.com');
      });

      it('should normalize mixed case with spaces', () => {
        const email = EmailVO.create(' User@Example.Com ');
        expect(email).toBe('user@example.com');
      });
    });

    describe('invalid emails', () => {
      it('should throw ValidationError when email is empty string', () => {
        expect(() => EmailVO.create('')).toThrow(ValidationError);
        expect(() => EmailVO.create('')).toThrow('Email must not be empty');
      });

      it('should throw ValidationError when email is only whitespace', () => {
        expect(() => EmailVO.create('   ')).toThrow(ValidationError);
        expect(() => EmailVO.create('   ')).toThrow('Email must not be empty');
      });

      it('should throw ValidationError when email missing @ symbol', () => {
        expect(() => EmailVO.create('userexample.com')).toThrow(ValidationError);
        expect(() => EmailVO.create('userexample.com')).toThrow('Invalid email address');
      });

      it('should throw ValidationError when email missing domain', () => {
        expect(() => EmailVO.create('user@')).toThrow(ValidationError);
        expect(() => EmailVO.create('user@')).toThrow('Invalid email address');
      });

      it('should throw ValidationError when email missing local part', () => {
        expect(() => EmailVO.create('@example.com')).toThrow(ValidationError);
        expect(() => EmailVO.create('@example.com')).toThrow('Invalid email address');
      });

      it('should throw ValidationError when email has multiple @ symbols', () => {
        expect(() => EmailVO.create('user@@example.com')).toThrow(ValidationError);
      });

      it('should throw ValidationError when email exceeds 254 characters', () => {
        const longEmail = 'a'.repeat(245) + '@example.com'; // 245 + 1 (@) + 11 = 257
        expect(() => EmailVO.create(longEmail)).toThrow(ValidationError);
        expect(() => EmailVO.create(longEmail)).toThrow('must not exceed 254 characters');
      });

      it('should throw ValidationError when email has invalid characters in domain', () => {
        expect(() => EmailVO.create('user@exam ple.com')).toThrow(ValidationError);
      });

      it('should throw ValidationError when domain has consecutive dots', () => {
        expect(() => EmailVO.create('user@example..com')).toThrow(ValidationError);
      });

      it('should throw ValidationError when domain ends with dot', () => {
        expect(() => EmailVO.create('user@example.com.')).toThrow(ValidationError);
      });

      it('should throw ValidationError for TLD-only domain', () => {
        expect(() => EmailVO.create('user@com')).toThrow(ValidationError);
      });
    });

    describe('edge cases', () => {
      it('should accept email at exactly 254 characters', () => {
        // 64 char local + @ + 189 char domain = 254
        // Domain labels must be ≤63 chars each per RFC 5321
        const localPart = 'a'.repeat(64);
        const domainPart = 'a'.repeat(62) + '.' + 'b'.repeat(62) + '.' + 'c'.repeat(59) + '.com';
        // 62 + 1 + 62 + 1 + 59 + 1 + 3 = 189
        const email = EmailVO.create(`${localPart}@${domainPart}`);
        expect(email).toBe(`${localPart}@${domainPart}`.toLowerCase());
      });

      it('should accept single character local part', () => {
        const email = EmailVO.create('a@example.com');
        expect(email).toBe('a@example.com');
      });

      it('should accept single character domain labels', () => {
        const email = EmailVO.create('user@a.b.com');
        expect(email).toBe('user@a.b.com');
      });

      it('should accept numeric TLD', () => {
        const email = EmailVO.create('user@example.123');
        expect(email).toBe('user@example.123');
      });
    });
  });

  describe('isValid', () => {
    it('should return true for valid email', () => {
      expect(EmailVO.isValid('user@example.com')).toBe(true);
    });

    it('should return true for valid email with subdomain', () => {
      expect(EmailVO.isValid('user@mail.example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(EmailVO.isValid('invalid-email')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(EmailVO.isValid('')).toBe(false);
    });

    it('should return false for email exceeding max length', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      expect(EmailVO.isValid(longEmail)).toBe(false);
    });

    it('should return true after normalization', () => {
      expect(EmailVO.isValid(' USER@EXAMPLE.COM ')).toBe(true);
    });
  });
});

// =============================================================================
// WalletAddress Value Object Tests
// =============================================================================

describe('WalletAddressVO', () => {
  describe('create', () => {
    describe('valid EVM addresses', () => {
      it('should create WalletAddress for valid EVM address', () => {
        const address = WalletAddressVO.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE');
        expect(address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE');
      });

      it('should create WalletAddress for all lowercase EVM address', () => {
        const address = WalletAddressVO.create('0xabcdef1234567890abcdef1234567890abcdef12');
        expect(address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      });

      it('should create WalletAddress for all uppercase EVM address', () => {
        const address = WalletAddressVO.create('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
        expect(address).toBe('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
      });

      it('should create WalletAddress for checksummed EVM address', () => {
        const address = WalletAddressVO.create('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
        expect(address).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
      });
    });

    describe('valid Solana addresses', () => {
      it('should create WalletAddress for valid Solana address (44 chars)', () => {
        const address = WalletAddressVO.create('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK');
        expect(address).toBe('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK');
      });

      it('should create WalletAddress for valid Solana address (32 chars)', () => {
        const address = WalletAddressVO.create('11111111111111111111111111111111');
        expect(address).toBe('11111111111111111111111111111111');
      });

      it('should create WalletAddress for Solana address with mixed case', () => {
        const address = WalletAddressVO.create('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
        expect(address).toBe('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
      });
    });

    describe('invalid addresses', () => {
      it('should throw ValidationError when address is empty', () => {
        expect(() => WalletAddressVO.create('')).toThrow(ValidationError);
        expect(() => WalletAddressVO.create('')).toThrow('Wallet address must not be empty');
      });

      it('should throw ValidationError when address is only whitespace', () => {
        expect(() => WalletAddressVO.create('   ')).toThrow(ValidationError);
      });

      it('should throw ValidationError for EVM address without 0x prefix', () => {
        expect(() => WalletAddressVO.create('742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toThrow(ValidationError);
      });

      it('should throw ValidationError for EVM address with wrong length', () => {
        expect(() => WalletAddressVO.create('0x742d35Cc')).toThrow(ValidationError);
      });

      it('should throw ValidationError for EVM address with invalid characters', () => {
        expect(() => WalletAddressVO.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEg')).toThrow(ValidationError);
      });

      it('should throw ValidationError for Solana address too short', () => {
        expect(() => WalletAddressVO.create('7EqQdEULxWcraVx3mXKFjc84LhCkMG')).toThrow(ValidationError);
      });

      it('should throw ValidationError for Solana address too long', () => {
        expect(() => WalletAddressVO.create('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK12345')).toThrow(ValidationError);
      });

      it('should throw ValidationError for Solana address with invalid base58 chars', () => {
        expect(() => WalletAddressVO.create('0OIl1111111111111111111111111111')).toThrow(ValidationError);
      });

      it('should throw ValidationError for random string', () => {
        expect(() => WalletAddressVO.create('not-a-wallet-address')).toThrow(ValidationError);
      });
    });

    describe('edge cases', () => {
      it('should preserve EVM address casing', () => {
        const mixed = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
        expect(WalletAddressVO.create(mixed)).toBe(mixed);
      });

      it('should preserve Solana address casing', () => {
        const address = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
        expect(WalletAddressVO.create(address)).toBe(address);
      });

      it('should trim whitespace from address', () => {
        const address = WalletAddressVO.create('  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE  ');
        expect(address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE');
      });
    });
  });

  describe('isValid', () => {
    it('should return true for valid EVM address', () => {
      expect(WalletAddressVO.isValid('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE')).toBe(true);
    });

    it('should return true for valid Solana address', () => {
      expect(WalletAddressVO.isValid('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK')).toBe(true);
    });

    it('should return false for invalid address', () => {
      expect(WalletAddressVO.isValid('not-a-wallet')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(WalletAddressVO.isValid('')).toBe(false);
    });

    it('should return false for EVM address without 0x', () => {
      expect(WalletAddressVO.isValid('742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(false);
    });

    it('should return true after trimming whitespace', () => {
      expect(WalletAddressVO.isValid('  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE  ')).toBe(true);
    });
  });

  describe('chainType', () => {
    it('should return "evm" for EVM address', () => {
      const address = WalletAddressVO.create('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE');
      expect(WalletAddressVO.chainType(address)).toBe('evm');
    });

    it('should return "solana" for Solana address (44 chars)', () => {
      const address = WalletAddressVO.create('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK');
      expect(WalletAddressVO.chainType(address)).toBe('solana');
    });

    it('should return "solana" for Solana address (32 chars)', () => {
      const address = WalletAddressVO.create('11111111111111111111111111111111');
      expect(WalletAddressVO.chainType(address)).toBe('solana');
    });
  });

  describe('normalize', () => {
    it('should lowercase EVM address', () => {
      const address = WalletAddressVO.create('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
      const normalized = WalletAddressVO.normalize(address);
      expect(normalized).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });

    it('should preserve Solana address case', () => {
      const address = WalletAddressVO.create('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
      const normalized = WalletAddressVO.normalize(address);
      expect(normalized).toBe('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
    });
  });
});

// =============================================================================
// User Entity Tests
// =============================================================================

describe('User Entity', () => {
  describe('structure', () => {
    it('should have all required fields', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        email: 'user@example.com',
        walletAddress: undefined,
        displayName: 'Test User',
        avatarUrl: undefined,
        role: 'user',
        createdAt: 1707849600000 as Timestamp,
        updatedAt: 1707849600000 as Timestamp,
      };

      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.displayName).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should allow undefined walletAddress', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        email: 'user@example.com',
        walletAddress: undefined,
        displayName: 'Test User',
        avatarUrl: undefined,
        role: 'user',
        createdAt: 1707849600000 as Timestamp,
        updatedAt: 1707849600000 as Timestamp,
      };

      expect(user.walletAddress).toBeUndefined();
    });

    it('should allow walletAddress to be set', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        email: 'user@example.com',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE',
        displayName: 'Test User',
        avatarUrl: undefined,
        role: 'user',
        createdAt: 1707849600000 as Timestamp,
        updatedAt: 1707849600000 as Timestamp,
      };

      expect(user.walletAddress).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbE');
    });

    it('should support admin role', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        email: 'admin@example.com',
        walletAddress: undefined,
        displayName: 'Admin User',
        avatarUrl: undefined,
        role: 'admin',
        createdAt: 1707849600000 as Timestamp,
        updatedAt: 1707849600000 as Timestamp,
      };

      expect(user.role).toBe('admin');
    });

    it('should allow avatarUrl to be set', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
        email: 'user@example.com',
        walletAddress: undefined,
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        role: 'user',
        createdAt: 1707849600000 as Timestamp,
        updatedAt: 1707849600000 as Timestamp,
      };

      expect(user.avatarUrl).toBe('https://example.com/avatar.png');
    });
  });
});

// =============================================================================
// Session Entity Tests
// =============================================================================

describe('Session Entity', () => {
  describe('structure', () => {
    it('should have all required fields', () => {
      const session: Session = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresAt: 1707853200000 as Timestamp,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
          email: 'user@example.com',
          walletAddress: undefined,
          displayName: 'Test User',
          avatarUrl: undefined,
          role: 'user',
          createdAt: 1707849600000 as Timestamp,
          updatedAt: 1707849600000 as Timestamp,
        },
      };

      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();
      expect(session.expiresAt).toBeDefined();
      expect(session.user).toBeDefined();
    });

    it('should contain user entity', () => {
      const session: Session = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: 1707853200000 as Timestamp,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
          email: 'user@example.com',
          walletAddress: undefined,
          displayName: 'Test User',
          avatarUrl: undefined,
          role: 'user',
          createdAt: 1707849600000 as Timestamp,
          updatedAt: 1707849600000 as Timestamp,
        },
      };

      expect(session.user.email).toBe('user@example.com');
      expect(session.user.displayName).toBe('Test User');
    });
  });
});

// =============================================================================
// Domain Error Tests
// =============================================================================

describe('ValidationError', () => {
  it('should have correct error name', () => {
    const error = new ValidationError('Validation failed', 'email');
    expect(error.name).toBe('ValidationError');
  });

  it('should have correct error code', () => {
    const error = new ValidationError('Validation failed', 'email');
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should store field name', () => {
    const error = new ValidationError('Invalid email', 'email');
    expect(error.field).toBe('email');
  });

  it('should have timestamp', () => {
    const before = Date.now();
    const error = new ValidationError('Validation failed');
    const after = Date.now();
    expect(error.timestamp).toBeGreaterThanOrEqual(before);
    expect(error.timestamp).toBeLessThanOrEqual(after);
  });

  it('should support violations array', () => {
    const violations = [
      { field: 'email', message: 'Invalid email format' },
      { field: 'password', message: 'Password too short' },
    ];
    const error = new ValidationError('Multiple validation errors', undefined, violations);
    expect(error.violations).toEqual(violations);
    expect(error.violations).toHaveLength(2);
  });

  it('should be instance of Error', () => {
    const error = new ValidationError('Validation failed');
    expect(error).toBeInstanceOf(Error);
  });
});
