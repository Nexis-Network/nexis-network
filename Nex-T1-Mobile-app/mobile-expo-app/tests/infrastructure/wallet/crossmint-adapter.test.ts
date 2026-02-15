/**
 * Unit tests for CrossmintWalletServiceAdapter.
 *
 * Validates the ICrossmintWalletService implementation that bridges
 * Crossmint smart wallet operations with the domain layer. Wallet
 * creation methods return "use hook" failures (actual creation is
 * React hook-driven). Swap quote delegates to JupiterClient.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { success, failure } from '@domain/common/types';
import { DomainError } from '@domain/common/errors/domain-error';

// ---------------------------------------------------------------------------
// Mock JupiterClient
// ---------------------------------------------------------------------------

const mockGetQuote = vi.fn();
const mockBuildSwapTransaction = vi.fn();

vi.mock('@infrastructure/wallet/jupiter-client', () => ({
  JupiterClient: vi.fn().mockImplementation(() => ({
    getQuote: mockGetQuote,
    buildSwapTransaction: mockBuildSwapTransaction,
  })),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CrossmintWalletServiceAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── mapCrossmintWalletToDomain ────────────────────────────────────────

  describe('mapCrossmintWalletToDomain', () => {
    it('should map a Crossmint EVM wallet response to a domain Wallet', async () => {
      const { mapCrossmintWalletToDomain } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const wallet = mapCrossmintWalletToDomain({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'evm',
        walletId: 'cm_wallet_123',
      });

      expect(wallet.address).toBe(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      );
      expect(wallet.chainType).toBe('evm');
      expect(wallet.chainId).toBe(8453); // Base chain
      expect(wallet.walletProvider).toBe('crossmint');
      expect(wallet.deploymentStatus).toBe('running');
      expect(wallet.isPrimary).toBe(true); // EVM wallets are primary
      expect(wallet.safeVersion).toBeUndefined();
      expect(wallet.crossmintWalletId).toBe('cm_wallet_123');
      expect(wallet.id).toBeDefined();
      expect(wallet.label).toContain('Base');
    });

    it('should map a Crossmint Solana wallet response to a domain Wallet', async () => {
      const { mapCrossmintWalletToDomain } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const wallet = mapCrossmintWalletToDomain({
        address: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        chain: 'solana',
        walletId: 'cm_wallet_456',
      });

      expect(wallet.address).toBe(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
      );
      expect(wallet.chainType).toBe('solana');
      expect(wallet.chainId).toBeUndefined(); // Solana has no numeric chainId
      expect(wallet.walletProvider).toBe('crossmint');
      expect(wallet.isPrimary).toBe(false); // Only EVM wallets are primary
      expect(wallet.crossmintWalletId).toBe('cm_wallet_456');
      expect(wallet.label).toContain('Solana');
    });

    it('should generate a deterministic UUID from the address', async () => {
      const { mapCrossmintWalletToDomain } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const wallet1 = mapCrossmintWalletToDomain({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'evm',
      });

      const wallet2 = mapCrossmintWalletToDomain({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'evm',
      });

      // Same address should produce the same UUID
      expect(wallet1.id).toBe(wallet2.id);
    });

    it('should generate a label with chain name and truncated address', async () => {
      const { mapCrossmintWalletToDomain } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const wallet = mapCrossmintWalletToDomain({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'evm',
      });

      expect(wallet.label).toContain('Base');
      expect(wallet.label).toContain('0x742d');
      expect(wallet.label).toContain('bEb0');
    });
  });

  // ── createSmartWallet ─────────────────────────────────────────────────

  describe('createSmartWallet', () => {
    it('should return "use hook instead" failure', async () => {
      const { CrossmintWalletServiceAdapter } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const adapter = new CrossmintWalletServiceAdapter();
      const result = await adapter.createSmartWallet('evm', 'some-jwt');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('USE_HOOK');
      }
    });
  });

  // ── getOrCreateWallets ────────────────────────────────────────────────

  describe('getOrCreateWallets', () => {
    it('should return "use hook instead" failure', async () => {
      const { CrossmintWalletServiceAdapter } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const adapter = new CrossmintWalletServiceAdapter();
      const result = await adapter.getOrCreateWallets(
        ['evm', 'solana'],
        'some-jwt',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('USE_HOOK');
      }
    });
  });

  // ── getSwapQuote ──────────────────────────────────────────────────────

  describe('getSwapQuote', () => {
    it('should delegate to JupiterClient and return quote on success', async () => {
      const expectedQuote = {
        inputMint: 'SOL',
        outputMint: 'USDC',
        inputAmount: '1000000000',
        outputAmount: '35000000',
        priceImpactPct: 0.01,
        routeData: {},
      };
      mockGetQuote.mockResolvedValue(success(expectedQuote));

      const { CrossmintWalletServiceAdapter } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const adapter = new CrossmintWalletServiceAdapter();
      const result = await adapter.getSwapQuote({
        inputMint: 'SOL',
        outputMint: 'USDC',
        amount: '1000000000',
        slippageBps: 50,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(expectedQuote);
      }
      expect(mockGetQuote).toHaveBeenCalledWith({
        inputMint: 'SOL',
        outputMint: 'USDC',
        amount: '1000000000',
        slippageBps: 50,
      });
    });

    it('should propagate JupiterClient failure', async () => {
      mockGetQuote.mockResolvedValue(
        failure(new DomainError('Jupiter down', 'JUPITER_QUOTE_ERROR')),
      );

      const { CrossmintWalletServiceAdapter } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const adapter = new CrossmintWalletServiceAdapter();
      const result = await adapter.getSwapQuote({
        inputMint: 'SOL',
        outputMint: 'USDC',
        amount: '1000',
        slippageBps: 50,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('JUPITER_QUOTE_ERROR');
      }
    });
  });

  // ── executeSwap ───────────────────────────────────────────────────────

  describe('executeSwap', () => {
    it('should return "use hook instead" failure', async () => {
      const { CrossmintWalletServiceAdapter } = await import(
        '@infrastructure/wallet/crossmint-adapter'
      );

      const adapter = new CrossmintWalletServiceAdapter();
      const result = await adapter.executeSwap({
        walletAddress: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        quote: {
          inputMint: 'SOL',
          outputMint: 'USDC',
          inputAmount: '1000',
          outputAmount: '35',
          priceImpactPct: 0.01,
          routeData: {},
        },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('USE_HOOK');
      }
    });
  });
});
