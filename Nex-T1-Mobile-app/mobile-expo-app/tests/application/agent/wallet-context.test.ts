/**
 * Unit tests for the AI Wallet Context Builder.
 *
 * Validates `buildWalletContext()` — the pure function that generates a
 * plain-text summary of the user's wallet state for AI agent prompts.
 */

import { describe, it, expect } from 'vitest';

import { buildWalletContext } from '@application/agent/wallet-context';
import type { Wallet, TokenBalance } from '@domain/wallet/entities/wallet';
import type { UUID } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Helpers — test fixtures
// ---------------------------------------------------------------------------

function createTestWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: '00000000-0000-4000-a000-000000000001' as UUID,
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    chainType: 'evm',
    chainId: 8453,
    label: 'Base • 0x742d...bEb0',
    isPrimary: true,
    safeVersion: undefined,
    deploymentStatus: 'running',
    walletProvider: 'crossmint',
    crossmintWalletId: 'cm_wallet_123',
    ...overrides,
  };
}

function createTestToken(overrides: Partial<TokenBalance> = {}): TokenBalance {
  return {
    tokenAddress: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    balance: '1.5',
    decimals: 18,
    usdValue: 3000.0,
    iconUrl: undefined,
    chainId: 8453,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildWalletContext', () => {
  // ── No wallet ──────────────────────────────────────────────────────────

  it('should return "no active wallet" message when wallet is null', () => {
    const result = buildWalletContext(null, [], 0);

    expect(result).toBe('The user has no active wallet connected.');
  });

  // ── Wallet with chain info ─────────────────────────────────────────────

  it('should include wallet address and chain info', () => {
    const wallet = createTestWallet();
    const result = buildWalletContext(wallet, [], 0);

    expect(result).toContain('Active wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
    expect(result).toContain('Chain: evm (chain ID: 8453)');
    expect(result).toContain('Wallet type: crossmint smart wallet');
    expect(result).toContain('Total portfolio value: $0.00');
    expect(result).toContain('No token balances available.');
  });

  // ── Wallet with tokens ────────────────────────────────────────────────

  it('should include token balances when available', () => {
    const wallet = createTestWallet();
    const portfolio: TokenBalance[] = [
      createTestToken({
        symbol: 'ETH',
        balance: '1.5',
        usdValue: 3000.0,
      }),
      createTestToken({
        tokenAddress: '0xusdc',
        symbol: 'USDC',
        name: 'USD Coin',
        balance: '500.25',
        decimals: 6,
        usdValue: 500.25,
      }),
    ];

    const result = buildWalletContext(wallet, portfolio, 3500.25);

    expect(result).toContain('Total portfolio value: $3500.25');
    expect(result).toContain('Token balances:');
    expect(result).toContain('ETH: 1.5 ($3000.00)');
    expect(result).toContain('USDC: 500.25 ($500.25)');
    expect(result).not.toContain('No token balances available.');
  });

  // ── Solana wallet includes Jupiter note ────────────────────────────────

  it('should mention Jupiter swaps for Solana wallets', () => {
    const wallet = createTestWallet({
      chainType: 'solana',
      chainId: undefined,
      address: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
    });

    const result = buildWalletContext(wallet, [], 0);

    expect(result).toContain('Chain: solana');
    expect(result).toContain('Jupiter swaps available on Solana.');
    expect(result).not.toContain('chain ID');
  });

  // ── Zero-balance tokens are excluded ──────────────────────────────────

  it('should exclude zero-balance tokens from the summary', () => {
    const wallet = createTestWallet();
    const portfolio: TokenBalance[] = [
      createTestToken({ symbol: 'ETH', balance: '1.0', usdValue: 2000.0 }),
      createTestToken({ symbol: 'USDC', balance: '0', usdValue: 0 }),
      createTestToken({ symbol: 'DAI', balance: '0.0', usdValue: 0 }),
    ];

    const result = buildWalletContext(wallet, portfolio, 2000.0);

    expect(result).toContain('ETH: 1.0 ($2000.00)');
    expect(result).not.toContain('USDC');
    expect(result).not.toContain('DAI');
  });

  // ── Token without usdValue ────────────────────────────────────────────

  it('should handle tokens with undefined usdValue', () => {
    const wallet = createTestWallet();
    const portfolio: TokenBalance[] = [
      createTestToken({
        symbol: 'UNKNOWN',
        balance: '100',
        usdValue: undefined,
      }),
    ];

    const result = buildWalletContext(wallet, portfolio, 0);

    expect(result).toContain('UNKNOWN: 100');
    // No dollar value should appear for this token
    expect(result).not.toContain('UNKNOWN: 100 ($');
  });
});
