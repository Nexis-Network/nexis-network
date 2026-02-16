/**
 * Unit tests for gas-service.
 *
 * Validates multi-chain gas estimation for EVM, Solana, and Stellar.
 * Tests mock external dependencies (viem, @solana/web3.js, fetch).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WalletError } from '@domain/common/errors/domain-error';
import type { GasEstimate } from '@domain/wallet/entities/gas';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// Mock viem
const mockEstimateFeesPerGas = vi.fn();
const mockCreatePublicClient = vi.fn(() => ({
  estimateFeesPerGas: mockEstimateFeesPerGas,
}));

vi.mock('viem', () => ({
  createPublicClient: () => mockCreatePublicClient(),
  http: vi.fn((url: string) => ({ url })),
  formatUnits: (value: bigint, decimals: number) => {
    const divisor = 10n ** BigInt(decimals);
    const integerPart = value / divisor;
    const remainder = value % divisor;
    const fractionalStr = remainder.toString().padStart(decimals, '0');
    return `${integerPart}.${fractionalStr}`;
  },
}));

vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  base: { id: 8453, name: 'Base' },
  optimism: { id: 10, name: 'Optimism' },
  arbitrum: { id: 42161, name: 'Arbitrum' },
  polygon: { id: 137, name: 'Polygon' },
  bsc: { id: 56, name: 'BNB Chain' },
  avalanche: { id: 43114, name: 'Avalanche' },
  celo: { id: 42220, name: 'Celo' },
}));

// Mock @solana/web3.js
const mockGetLatestBlockhash = vi.fn();
const mockConnection = {
  getLatestBlockhash: mockGetLatestBlockhash,
};

vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn(() => mockConnection),
  clusterApiUrl: vi.fn(() => 'https://api.mainnet-beta.solana.com'),
}));

// Mock config/chains
vi.mock('@config/chains', () => ({
  getChainById: vi.fn((id: number) => {
    const chains: Record<number, { rpcUrl: string; name: string }> = {
      1: { rpcUrl: 'https://ethereum.publicnode.com', name: 'Ethereum' },
      8453: { rpcUrl: 'https://mainnet.base.org', name: 'Base' },
      137: { rpcUrl: 'https://polygon-rpc.com', name: 'Polygon' },
    };
    return chains[id] ?? undefined;
  }),
  getSolanaChain: vi.fn(() => ({
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    name: 'Solana',
  })),
  getStellarChain: vi.fn(() => ({
    rpcUrl: 'https://horizon.stellar.org',
    name: 'Stellar',
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(body: unknown, status = 200): void {
  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

/**
 * Type guard to check if GasEstimate is EVM type.
 */
function isEvmGasEstimate(
  estimate: GasEstimate,
): estimate is GasEstimate & { readonly chain: 'evm' } {
  return estimate.chain === 'evm';
}

/**
 * Type guard to check if GasEstimate is Solana type.
 */
function isSolanaGasEstimate(
  estimate: GasEstimate,
): estimate is GasEstimate & { readonly chain: 'solana' } {
  return estimate.chain === 'solana';
}

/**
 * Type guard to check if GasEstimate is Stellar type.
 */
function isStellarGasEstimate(
  estimate: GasEstimate,
): estimate is GasEstimate & { readonly chain: 'stellar' } {
  return estimate.chain === 'stellar';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('gas-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockReset();
  });

  afterEach(async () => {
    // Clear cached clients between tests
    const { clearClientCaches } = await import(
      '@infrastructure/wallet/gas-service'
    );
    clearClientCaches();
  });

  // ── estimateEvmGas ─────────────────────────────────────────────────────

  describe('estimateEvmGas', () => {
    it('should return 3 gas tiers with correct structure', async () => {
      mockEstimateFeesPerGas.mockResolvedValueOnce({
        maxFeePerGas: 30000000000n, // 30 gwei
        maxPriorityFeePerGas: 1500000000n, // 1.5 gwei
      });

      const { estimateEvmGas } = await import(
        '@infrastructure/wallet/gas-service'
      );

      const result = await estimateEvmGas(1, 2500);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.chain).toBe('evm');

      if (!isEvmGasEstimate(result.value)) {
        throw new Error('Expected EVM gas estimate');
      }

      expect(result.value.tiers).toHaveLength(3);

      // Verify tier structure
      const [slow, standard, fast] = result.value.tiers;

      expect(slow.speed).toBe('slow');
      expect(standard.speed).toBe('standard');
      expect(fast.speed).toBe('fast');

      // All tiers should have the same gas limit
      expect(slow.gasLimit).toBe(21000n);
      expect(standard.gasLimit).toBe(21000n);
      expect(fast.gasLimit).toBe(21000n);

      // Fast should have higher fees than standard, standard higher than slow
      expect(fast.maxPriorityFeePerGas).toBeGreaterThan(standard.maxPriorityFeePerGas);
      expect(standard.maxPriorityFeePerGas).toBeGreaterThan(slow.maxPriorityFeePerGas);

      // USD fees should be calculated
      expect(slow.estimatedFeeUsd).toBeGreaterThan(0);
      expect(standard.estimatedFeeUsd).toBeGreaterThan(0);
      expect(fast.estimatedFeeUsd).toBeGreaterThan(0);
    });

    it('should return failure for unsupported chain', async () => {
      const { estimateEvmGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateEvmGas(999999, 2500);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toBeInstanceOf(WalletError);
      expect(result.error.message).toContain('Unsupported EVM chain');
    });

    it('should return failure on RPC error', async () => {
      mockEstimateFeesPerGas.mockRejectedValueOnce(new Error('RPC timeout'));

      const { estimateEvmGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateEvmGas(1, 2500);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toBeInstanceOf(WalletError);
      expect(result.error.message).toContain('RPC timeout');
    });

    it('should calculate correct USD values', async () => {
      mockEstimateFeesPerGas.mockResolvedValueOnce({
        maxFeePerGas: 20000000000n, // 20 gwei
        maxPriorityFeePerGas: 1000000000n, // 1 gwei
      });

      const { estimateEvmGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const ethPrice = 3000;
      const result = await estimateEvmGas(1, ethPrice);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      if (!isEvmGasEstimate(result.value)) {
        throw new Error('Expected EVM gas estimate');
      }

      // Verify USD calculation is reasonable
      const standardTier = result.value.tiers[1];
      expect(standardTier.estimatedFeeUsd).toBeGreaterThan(0);
      expect(standardTier.estimatedFeeUsd).toBeLessThan(100); // Sanity check
    });
  });

  // ── estimateSolanaGas ──────────────────────────────────────────────────

  describe('estimateSolanaGas', () => {
    it('should return correct Solana gas estimate structure', async () => {
      mockGetLatestBlockhash.mockResolvedValueOnce({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 12345,
      });

      const { estimateSolanaGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateSolanaGas(150);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.chain).toBe('solana');

      if (!isSolanaGasEstimate(result.value)) {
        throw new Error('Expected Solana gas estimate');
      }

      expect(result.value.estimate).toBeDefined();

      const { estimate } = result.value;
      expect(estimate.lamportsPerSignature).toBe(5000);
      expect(estimate.signatureCount).toBe(1);
      expect(estimate.totalLamports).toBe(5000);
      expect(estimate.feeSol).toBe('0.000005000');
      expect(estimate.feeUsd).toBeCloseTo(0.00075, 5);
    });

    it('should use default lamports when RPC fails', async () => {
      mockGetLatestBlockhash.mockRejectedValueOnce(new Error('Network error'));

      const { estimateSolanaGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateSolanaGas(150);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      if (!isSolanaGasEstimate(result.value)) {
        throw new Error('Expected Solana gas estimate');
      }

      expect(result.value.estimate.lamportsPerSignature).toBe(5000);
    });

    it('should calculate correct USD fee', async () => {
      mockGetLatestBlockhash.mockResolvedValueOnce({
        blockhash: 'test',
        lastValidBlockHeight: 100,
      });

      const { estimateSolanaGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const solPrice = 200;
      const result = await estimateSolanaGas(solPrice);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      if (!isSolanaGasEstimate(result.value)) {
        throw new Error('Expected Solana gas estimate');
      }

      // 5000 lamports = 0.000005 SOL * $200 = $0.001
      expect(result.value.estimate.feeUsd).toBeCloseTo(0.001, 6);
    });
  });

  // ── estimateStellarGas ─────────────────────────────────────────────────

  describe('estimateStellarGas', () => {
    it('should return correct Stellar gas estimate structure', async () => {
      mockFetchResponse({
        last_ledger_base_fee: '100',
        last_ledger: '12345',
      });

      const { estimateStellarGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateStellarGas(0.12);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.chain).toBe('stellar');

      if (!isStellarGasEstimate(result.value)) {
        throw new Error('Expected Stellar gas estimate');
      }

      expect(result.value.estimate).toBeDefined();

      const { estimate } = result.value;
      expect(estimate.baseFeeStroops).toBe(100);
      expect(estimate.operationCount).toBe(1);
      expect(estimate.totalStroops).toBe(100);
      expect(estimate.feeXlm).toBe('0.0000100');
    });

    it('should use default stroops when Horizon API fails', async () => {
      mockFetchResponse({ error: 'Server error' }, 500);

      const { estimateStellarGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateStellarGas(0.12);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      if (!isStellarGasEstimate(result.value)) {
        throw new Error('Expected Stellar gas estimate');
      }

      expect(result.value.estimate.baseFeeStroops).toBe(100);
    });

    it('should use default stroops on network exception', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network timeout'));

      const { estimateStellarGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateStellarGas(0.12);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      if (!isStellarGasEstimate(result.value)) {
        throw new Error('Expected Stellar gas estimate');
      }

      expect(result.value.estimate.baseFeeStroops).toBe(100);
    });

    it('should calculate correct USD fee', async () => {
      mockFetchResponse({
        last_ledger_base_fee: '200',
      });

      const { estimateStellarGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const xlmPrice = 0.10; // $0.10 per XLM
      const result = await estimateStellarGas(xlmPrice);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      if (!isStellarGasEstimate(result.value)) {
        throw new Error('Expected Stellar gas estimate');
      }

      // 200 stroops = 0.00002 XLM * $0.10 = $0.000002
      expect(result.value.estimate.baseFeeStroops).toBe(200);
      expect(result.value.estimate.feeUsd).toBeCloseTo(0.000002, 8);
    });

    it('should fetch from correct Horizon endpoint', async () => {
      mockFetchResponse({ last_ledger_base_fee: '100' });

      const { estimateStellarGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      await estimateStellarGas(0.12);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall).toBeDefined();
      if (fetchCall) {
        expect(fetchCall[0]).toContain('/fee_stats');
      }
    });
  });

  // ── Error wrapping ─────────────────────────────────────────────────────

  describe('error handling', () => {
    it('should wrap EVM errors in WalletError', async () => {
      mockEstimateFeesPerGas.mockRejectedValueOnce(new Error('Custom RPC error'));

      const { estimateEvmGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateEvmGas(1, 2500);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toBeInstanceOf(WalletError);
      expect(result.error.message).toContain('Custom RPC error');
      expect(result.error.code).toBe('WALLET_ERROR');
    });

    it('should wrap non-Error exceptions in WalletError', async () => {
      mockEstimateFeesPerGas.mockRejectedValueOnce('String error');

      const { estimateEvmGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      const result = await estimateEvmGas(1, 2500);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toBeInstanceOf(WalletError);
      expect(result.error.message).toContain('String error');
    });
  });

  // ── Client caching ─────────────────────────────────────────────────────

  describe('client caching', () => {
    it('should reuse cached EVM client for same chain', async () => {
      mockEstimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 30000000000n,
        maxPriorityFeePerGas: 1500000000n,
      });

      const { estimateEvmGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      // First call
      await estimateEvmGas(1, 2500);
      // Second call to same chain
      await estimateEvmGas(1, 2500);

      // Client should only be created once
      expect(mockCreatePublicClient).toHaveBeenCalledTimes(1);
    });

    it('should create separate clients for different chains', async () => {
      mockEstimateFeesPerGas.mockResolvedValue({
        maxFeePerGas: 30000000000n,
        maxPriorityFeePerGas: 1500000000n,
      });

      const { estimateEvmGas, clearClientCaches } = await import(
        '@infrastructure/wallet/gas-service'
      );
      clearClientCaches();

      // Call for Ethereum
      await estimateEvmGas(1, 2500);
      // Call for Polygon
      await estimateEvmGas(137, 1);

      // Should create 2 separate clients
      expect(mockCreatePublicClient).toHaveBeenCalledTimes(2);
    });
  });
});
