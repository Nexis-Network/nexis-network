/**
 * Unit tests for allowance-service.
 *
 * Validates ERC-20 allowance fetching and revoke transaction preparation.
 * Tests mock viem's createPublicClient and multicall.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PublicClient } from 'viem';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMulticall = vi.fn();
const mockPublicClient = {
  multicall: mockMulticall,
} as unknown as PublicClient;

// Mock viem before importing the service
vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => mockPublicClient),
    http: vi.fn(() => 'http-transport'),
  };
});

// Mock the chain config
vi.mock('@config/chains', () => ({
  getChainById: vi.fn((chainId: number) => {
    const chains: Record<number, { rpcUrl: string }> = {
      1: { rpcUrl: 'https://ethereum.publicnode.com' },
      8453: { rpcUrl: 'https://mainnet.base.org' },
    };
    return chains[chainId];
  }),
}));

// ---------------------------------------------------------------------------
// Test Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  fetchAllowances,
  revokeAllowance,
  WELL_KNOWN_SPENDERS,
  clientCache,
} from '@infrastructure/wallet/allowance-service';

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('allowance-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the client cache before each test
    clientCache.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── fetchAllowances ─────────────────────────────────────────────────────

  describe('fetchAllowances', () => {
    it('should return correctly mapped allowances for non-zero values', async () => {
      const ownerAddress = '0x1234567890123456789012345678901234567890';
      const chainId = 1;
      const tokens = [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
      ];

      // Mock multicall to return allowances for each spender
      // First spender: 1000 USDC, others: 0
      const usdcAllowance = 1000000000n; // 1000 USDC (6 decimals)
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: usdcAllowance }, // Uniswap V3 Router
        { status: 'success', result: 0n }, // 0x Exchange Proxy
        { status: 'success', result: 0n }, // 1inch Router V5
        { status: 'success', result: 0n }, // SushiSwap Router
      ]);

      const result = await fetchAllowances(ownerAddress, chainId, tokens);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      const allowance = result.value[0];

      expect(allowance).toBeDefined();
      if (!allowance) return;

      expect(allowance.chainId).toBe(chainId);
      expect(allowance.tokenSymbol).toBe('USDC');
      expect(allowance.tokenAddress).toBe(tokens[0]?.address);
      expect(allowance.tokenDecimals).toBe(6);
      expect(allowance.spenderAddress).toBe(WELL_KNOWN_SPENDERS[0]?.address);
      expect(allowance.spenderLabel).toBe('Uniswap V3 Router');
      expect(allowance.allowanceRaw).toBe(usdcAllowance.toString());
      expect(allowance.allowanceFormatted).toBe('1000');
      expect(allowance.isUnlimited).toBe(false);
      expect(allowance.id).toBe(
        `${chainId}-${tokens[0]?.address.toLowerCase()}-${WELL_KNOWN_SPENDERS[0]?.address.toLowerCase()}`,
      );
    });

    it('should filter out zero allowances', async () => {
      const ownerAddress = '0x1234567890123456789012345678901234567890';
      const chainId = 1;
      const tokens = [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
      ];

      // All allowances are zero
      mockMulticall.mockResolvedValueOnce(
        Array(tokens.length * 4).fill({ status: 'success', result: 0n }),
      );

      const result = await fetchAllowances(ownerAddress, chainId, tokens);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(0);
    });

    it('should detect unlimited allowances', async () => {
      const ownerAddress = '0x1234567890123456789012345678901234567890';
      const chainId = 1;
      const tokens = [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
      ];

      // Unlimited allowance (2^256 - 1)
      const unlimitedAllowance = 2n ** 256n - 1n;
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: unlimitedAllowance },
        { status: 'success', result: 0n },
        { status: 'success', result: 0n },
        { status: 'success', result: 0n },
      ]);

      const result = await fetchAllowances(ownerAddress, chainId, tokens);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(1);
      const allowance = result.value[0];
      expect(allowance?.isUnlimited).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      // Clear cache to force client creation
      clientCache.clear();

      const ownerAddress = '0x1234567890123456789012345678901234567890';
      const chainId = 1;
      const tokens = [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
      ];

      // Simulate network error
      mockMulticall.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await fetchAllowances(ownerAddress, chainId, tokens);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.message).toContain('Failed to fetch allowances');
      expect(result.error.message).toContain('Network timeout');
    });

    it('should return failure for invalid owner address', async () => {
      const invalidAddress = 'not-a-valid-address';
      const chainId = 1;
      const tokens = [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
      ];

      const result = await fetchAllowances(invalidAddress, chainId, tokens);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.message).toContain('Invalid owner address');
    });

    it('should return empty array when no tokens provided', async () => {
      const ownerAddress = '0x1234567890123456789012345678901234567890';
      const chainId = 1;
      const tokens: ReadonlyArray<{ address: string; symbol: string; decimals: number }> = [];

      const result = await fetchAllowances(ownerAddress, chainId, tokens);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(0);
      // Multicall should not be called when no tokens
      expect(mockMulticall).not.toHaveBeenCalled();
    });

    it('should return failure for unsupported chain', async () => {
      // Clear cache
      clientCache.clear();

      const ownerAddress = '0x1234567890123456789012345678901234567890';
      const unsupportedChainId = 99999;
      const tokens = [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
      ];

      const result = await fetchAllowances(ownerAddress, unsupportedChainId, tokens);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.message).toContain('Unsupported EVM chain');
    });

    it('should handle multiple tokens with multiple allowances', async () => {
      const ownerAddress = '0x1234567890123456789012345678901234567890';
      const chainId = 1;
      const tokens = [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
      ];

      // Mock: USDC has allowance for Uniswap, USDT has allowance for 1inch
      mockMulticall.mockResolvedValueOnce([
        // USDC allowances (4 spenders)
        { status: 'success', result: 500000000n }, // Uniswap: 500 USDC
        { status: 'success', result: 0n }, // 0x
        { status: 'success', result: 0n }, // 1inch
        { status: 'success', result: 0n }, // Sushi
        // USDT allowances (4 spenders)
        { status: 'success', result: 0n }, // Uniswap
        { status: 'success', result: 0n }, // 0x
        { status: 'success', result: 200000000n }, // 1inch: 200 USDT
        { status: 'success', result: 0n }, // Sushi
      ]);

      const result = await fetchAllowances(ownerAddress, chainId, tokens);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value).toHaveLength(2);

      const usdcAllowance = result.value.find((a) => a.tokenSymbol === 'USDC');
      const usdtAllowance = result.value.find((a) => a.tokenSymbol === 'USDT');

      expect(usdcAllowance?.spenderLabel).toBe('Uniswap V3 Router');
      expect(usdcAllowance?.allowanceFormatted).toBe('500');

      expect(usdtAllowance?.spenderLabel).toBe('1inch Router V5');
      expect(usdtAllowance?.allowanceFormatted).toBe('200');
    });

    it('should skip failed multicall results', async () => {
      const ownerAddress = '0x1234567890123456789012345678901234567890';
      const chainId = 1;
      const tokens = [
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
      ];

      // Mix of success and failure results
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: 1000000000n }, // Success: 1000 USDC
        { status: 'failure', error: new Error('Contract revert') }, // Failed
        { status: 'success', result: 500000000n }, // Success: 500 USDC
        { status: 'success', result: 0n }, // Zero allowance
      ]);

      const result = await fetchAllowances(ownerAddress, chainId, tokens);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Should have 2 allowances (skipping failed and zero)
      expect(result.value).toHaveLength(2);
    });
  });

  // ── revokeAllowance ─────────────────────────────────────────────────────

  describe('revokeAllowance', () => {
    it('should return unsigned tx with approve(spender, 0) calldata', async () => {
      const chainId = 1;
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const spenderAddress = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

      const result = await revokeAllowance(chainId, tokenAddress, spenderAddress);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.unsignedTx.to).toBe(tokenAddress);
      expect(result.value.unsignedTx.data).toBeDefined();
      expect(result.value.unsignedTx.data.startsWith('0x')).toBe(true);

      // The approve function selector is 0x095ea7b3
      expect(result.value.unsignedTx.data.startsWith('0x095ea7b3')).toBe(true);

      // The data should contain the spender address (padded to 32 bytes) and amount (0)
      // Length: 0x (2) + selector (8) + spender (64) + amount (64) = 138
      expect(result.value.unsignedTx.data.length).toBe(138);

      // Amount should be 0 (last 64 chars should be zeros)
      expect(result.value.unsignedTx.data.slice(-64)).toBe('0'.repeat(64));
    });

    it('should return failure for invalid token address', async () => {
      const chainId = 1;
      const invalidTokenAddress = 'not-an-address';
      const spenderAddress = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

      const result = await revokeAllowance(chainId, invalidTokenAddress, spenderAddress);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.message).toContain('Invalid token address');
    });

    it('should return failure for invalid spender address', async () => {
      const chainId = 1;
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const invalidSpenderAddress = '0xinvalid';

      const result = await revokeAllowance(chainId, tokenAddress, invalidSpenderAddress);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.message).toContain('Invalid spender address');
    });

    it('should return failure for unsupported chain', async () => {
      const unsupportedChainId = 99999;
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const spenderAddress = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

      const result = await revokeAllowance(unsupportedChainId, tokenAddress, spenderAddress);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.message).toContain('Unsupported EVM chain');
    });

    it('should handle lowercase and checksum addresses consistently', async () => {
      const chainId = 1;
      // Lowercase address
      const tokenAddressLower = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      // Checksum address
      const spenderAddressChecksum = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

      const result = await revokeAllowance(chainId, tokenAddressLower, spenderAddressChecksum);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.unsignedTx.to).toBe(tokenAddressLower);
    });
  });

  // ── Well-known spenders ─────────────────────────────────────────────────

  describe('WELL_KNOWN_SPENDERS', () => {
    it('should contain known DeFi routers', () => {
      expect(WELL_KNOWN_SPENDERS.length).toBeGreaterThan(0);

      const labels = WELL_KNOWN_SPENDERS.map((s) => s.label);
      expect(labels).toContain('Uniswap V3 Router');
      expect(labels).toContain('0x Exchange Proxy');
      expect(labels).toContain('1inch Router V5');
      expect(labels).toContain('SushiSwap Router');
    });

    it('should have valid addresses', () => {
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;

      for (const spender of WELL_KNOWN_SPENDERS) {
        expect(spender.address).toMatch(addressRegex);
      }
    });
  });
});
