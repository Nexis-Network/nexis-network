/**
 * Unit tests for staking-service.
 *
 * Tests the staking position fetchers for EVM liquid staking tokens and
 * Solana native stake accounts. Mocks viem's createPublicClient/multicall
 * and @solana/web3.js Connection.getParsedProgramAccounts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublicKey } from '@solana/web3.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(() => 'mocked-transport'),
  formatUnits: vi.fn((value: bigint, decimals: number) => {
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const remainder = value % divisor;
    const remainderStr = remainder.toString().padStart(decimals, '0');
    return `${integerPart}.${remainderStr}`;
  }),
}));

vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
}));

// Mock @solana/web3.js Connection
const mockGetParsedProgramAccounts = vi.fn();
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getParsedProgramAccounts: mockGetParsedProgramAccounts,
    })),
    LAMPORTS_PER_SOL: 1_000_000_000,
  };
});

// Mock config/chains
vi.mock('@config/chains', () => ({
  getChainById: vi.fn((chainId: number) => {
    if (chainId === 1) {
      return {
        id: 1,
        name: 'Ethereum',
        type: 'evm',
        symbol: 'ETH',
        decimals: 18,
        rpcUrl: 'https://ethereum.publicnode.com',
        explorerUrl: 'https://etherscan.io',
        iconName: 'ethereum',
        isTestnet: false,
      };
    }
    return undefined;
  }),
  getSolanaChain: vi.fn(() => ({
    id: 'solana-mainnet',
    name: 'Solana',
    type: 'solana',
    symbol: 'SOL',
    decimals: 9,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    iconName: 'solana',
    isTestnet: false,
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPublicClient(multicallResults: unknown[]) {
  return {
    multicall: vi.fn().mockResolvedValue(multicallResults),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('staking-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clear the client cache between tests
    const { clearClientCache } = await import(
      '@infrastructure/wallet/staking-service'
    );
    clearClientCache();
  });

  // ── EVM Liquid Staking ─────────────────────────────────────────────────

  describe('fetchEvmStakingPositions', () => {
    it('should return stETH position with correct formatting', async () => {
      const { createPublicClient } = await import('viem');

      // 1.5 stETH in wei (1.5 * 10^18)
      const stETHBalance = BigInt('1500000000000000000');

      const mockClient = createMockPublicClient([
        { status: 'success', result: stETHBalance }, // stETH balance
        { status: 'success', result: BigInt(0) }, // rETH balance
        { status: 'success', result: BigInt(0) }, // cbETH balance
      ]);

      vi.mocked(createPublicClient).mockReturnValue(mockClient as never);

      const { fetchEvmStakingPositions, setEvmClient } = await import(
        '@infrastructure/wallet/staking-service'
      );

      setEvmClient(mockClient as never);

      const tokenPrices = {
        steth: 2000,
        reth: 2050,
        cbeth: 1980,
      };

      const result = await fetchEvmStakingPositions(
        '0x1234567890123456789012345678901234567890',
        1,
        tokenPrices,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(1);

      const position = result.value[0];
      expect(position).toBeDefined();
      if (!position) throw new Error('Expected position');

      expect(position.chain).toBe('evm');
      expect(position.chainId).toBe(1);
      expect(position.protocolName).toBe('Lido');
      expect(position.stakedTokenSymbol).toBe('stETH');
      expect(position.amountStaked).toBe('1500000000000000000');
      expect(position.amountStakedFormatted).toBe('1.500000000000000000');
      expect(position.amountStakedUsd).toBe(3000); // 1.5 * 2000
      expect(position.canUnstake).toBe(true);
      expect(position.canClaimRewards).toBe(false);
    });

    it('should return multiple positions when multiple tokens have balances', async () => {
      const { createPublicClient } = await import('viem');

      const stETHBalance = BigInt('2000000000000000000'); // 2 stETH
      const rETHBalance = BigInt('1000000000000000000'); // 1 rETH
      const cbETHBalance = BigInt('500000000000000000'); // 0.5 cbETH

      const mockClient = createMockPublicClient([
        { status: 'success', result: stETHBalance },
        { status: 'success', result: rETHBalance },
        { status: 'success', result: cbETHBalance },
      ]);

      vi.mocked(createPublicClient).mockReturnValue(mockClient as never);

      const { fetchEvmStakingPositions, setEvmClient } = await import(
        '@infrastructure/wallet/staking-service'
      );

      setEvmClient(mockClient as never);

      const tokenPrices = {
        steth: 2000,
        reth: 2100,
        cbeth: 1950,
      };

      const result = await fetchEvmStakingPositions(
        '0x1234567890123456789012345678901234567890',
        1,
        tokenPrices,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(3);

      // Verify each position
      const stethPos = result.value.find((p) => p.stakedTokenSymbol === 'stETH');
      const rethPos = result.value.find((p) => p.stakedTokenSymbol === 'rETH');
      const cbethPos = result.value.find((p) => p.stakedTokenSymbol === 'cbETH');

      expect(stethPos).toBeDefined();
      expect(stethPos?.amountStakedUsd).toBe(4000); // 2 * 2000

      expect(rethPos).toBeDefined();
      expect(rethPos?.protocolName).toBe('Rocket Pool');
      expect(rethPos?.amountStakedUsd).toBe(2100); // 1 * 2100

      expect(cbethPos).toBeDefined();
      expect(cbethPos?.protocolName).toBe('Coinbase');
      expect(cbethPos?.amountStakedUsd).toBe(975); // 0.5 * 1950
    });

    it('should return empty array when no balances', async () => {
      const { createPublicClient } = await import('viem');

      const mockClient = createMockPublicClient([
        { status: 'success', result: BigInt(0) },
        { status: 'success', result: BigInt(0) },
        { status: 'success', result: BigInt(0) },
      ]);

      vi.mocked(createPublicClient).mockReturnValue(mockClient as never);

      const { fetchEvmStakingPositions, setEvmClient } = await import(
        '@infrastructure/wallet/staking-service'
      );

      setEvmClient(mockClient as never);

      const result = await fetchEvmStakingPositions(
        '0x1234567890123456789012345678901234567890',
        1,
        { steth: 2000, reth: 2050, cbeth: 1980 },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(0);
    });

    it('should handle failed multicall results gracefully', async () => {
      const { createPublicClient } = await import('viem');

      const stETHBalance = BigInt('1000000000000000000');

      const mockClient = createMockPublicClient([
        { status: 'success', result: stETHBalance },
        { status: 'failure', error: new Error('RPC error') },
        { status: 'success', result: BigInt(0) },
      ]);

      vi.mocked(createPublicClient).mockReturnValue(mockClient as never);

      const { fetchEvmStakingPositions, setEvmClient } = await import(
        '@infrastructure/wallet/staking-service'
      );

      setEvmClient(mockClient as never);

      const result = await fetchEvmStakingPositions(
        '0x1234567890123456789012345678901234567890',
        1,
        { steth: 2000 },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      // Should still return stETH position, skip failed rETH
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.stakedTokenSymbol).toBe('stETH');
    });

    it('should return failure for unsupported chain ID', async () => {
      const { fetchEvmStakingPositions } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const result = await fetchEvmStakingPositions(
        '0x1234567890123456789012345678901234567890',
        137, // Polygon - not supported for liquid staking
        { steth: 2000 },
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');

      expect(result.error.message).toContain('only supported on Ethereum mainnet');
    });

    it('should use zero for missing token prices', async () => {
      const { createPublicClient } = await import('viem');

      const stETHBalance = BigInt('1000000000000000000');

      const mockClient = createMockPublicClient([
        { status: 'success', result: stETHBalance },
        { status: 'success', result: BigInt(0) },
        { status: 'success', result: BigInt(0) },
      ]);

      vi.mocked(createPublicClient).mockReturnValue(mockClient as never);

      const { fetchEvmStakingPositions, setEvmClient } = await import(
        '@infrastructure/wallet/staking-service'
      );

      setEvmClient(mockClient as never);

      // No price for stETH
      const result = await fetchEvmStakingPositions(
        '0x1234567890123456789012345678901234567890',
        1,
        {},
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.amountStakedUsd).toBe(0);
    });

    it('should return failure on multicall exception', async () => {
      const { createPublicClient } = await import('viem');

      const mockClient = {
        multicall: vi.fn().mockRejectedValue(new Error('Network timeout')),
      };

      vi.mocked(createPublicClient).mockReturnValue(mockClient as never);

      const { fetchEvmStakingPositions, setEvmClient } = await import(
        '@infrastructure/wallet/staking-service'
      );

      setEvmClient(mockClient as never);

      const result = await fetchEvmStakingPositions(
        '0x1234567890123456789012345678901234567890',
        1,
        { steth: 2000 },
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');

      expect(result.error.message).toContain('Network timeout');
    });
  });

  // ── Solana Native Staking ──────────────────────────────────────────────

  describe('fetchSolanaStakingPositions', () => {
    it('should return parsed stake accounts', async () => {
      const stakeAccountPubkey = new PublicKey(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
      );
      const validatorPubkey = 'CertusDeBmqN8ZawdkxK5kFGMwBXdudvWHYwtNgNhvLu';

      mockGetParsedProgramAccounts.mockResolvedValue([
        {
          pubkey: stakeAccountPubkey,
          account: {
            data: {
              program: 'stake',
              parsed: {
                type: 'delegated',
                info: {
                  stake: {
                    delegation: {
                      stake: '5000000000', // 5 SOL
                      voter: validatorPubkey,
                      activationEpoch: '300',
                      deactivationEpoch: '18446744073709551615',
                    },
                  },
                  meta: {
                    authorized: {
                      staker: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
                      withdrawer: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      const { fetchSolanaStakingPositions, setSolanaConnection } = await import(
        '@infrastructure/wallet/staking-service'
      );

      // Set up mock connection
      const { Connection } = await import('@solana/web3.js');
      const mockConnection = new Connection('https://api.mainnet-beta.solana.com');
      setSolanaConnection(mockConnection);

      const result = await fetchSolanaStakingPositions(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        100, // $100 per SOL
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(1);

      const position = result.value[0];
      expect(position).toBeDefined();
      if (!position) throw new Error('Expected position');

      expect(position.chain).toBe('solana');
      expect(position.chainId).toBe('solana-mainnet');
      expect(position.stakedTokenSymbol).toBe('SOL');
      expect(position.amountStaked).toBe('5000000000');
      expect(position.amountStakedFormatted).toBe('5.000000000');
      expect(position.amountStakedUsd).toBe(500); // 5 SOL * $100
      expect(position.apy).toBe(6.5);
      expect(position.canUnstake).toBe(true);
      expect(position.canClaimRewards).toBe(false);
      expect(position.protocolName).toContain('Cert');
    });

    it('should return multiple stake accounts', async () => {
      const stakeAccount1 = new PublicKey(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
      );
      const stakeAccount2 = new PublicKey(
        '9WzDXwBbmPgP1XxJqTmFfjEVTt9e8ZVqGG1KfJd1xZUU',
      );

      mockGetParsedProgramAccounts.mockResolvedValue([
        {
          pubkey: stakeAccount1,
          account: {
            data: {
              program: 'stake',
              parsed: {
                type: 'delegated',
                info: {
                  stake: {
                    delegation: {
                      stake: '10000000000', // 10 SOL
                      voter: 'Validator1',
                    },
                  },
                },
              },
            },
          },
        },
        {
          pubkey: stakeAccount2,
          account: {
            data: {
              program: 'stake',
              parsed: {
                type: 'delegated',
                info: {
                  stake: {
                    delegation: {
                      stake: '20000000000', // 20 SOL
                      voter: 'Validator2',
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      const { fetchSolanaStakingPositions, setSolanaConnection } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const { Connection } = await import('@solana/web3.js');
      const mockConnection = new Connection('https://api.mainnet-beta.solana.com');
      setSolanaConnection(mockConnection);

      const result = await fetchSolanaStakingPositions(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        50, // $50 per SOL
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(2);

      const totalStaked = result.value.reduce(
        (sum, pos) => sum + parseFloat(pos.amountStakedFormatted),
        0,
      );
      expect(totalStaked).toBe(30); // 10 + 20 SOL

      const totalUsd = result.value.reduce(
        (sum, pos) => sum + pos.amountStakedUsd,
        0,
      );
      expect(totalUsd).toBe(1500); // 30 SOL * $50
    });

    it('should return empty array when no stake accounts', async () => {
      mockGetParsedProgramAccounts.mockResolvedValue([]);

      const { fetchSolanaStakingPositions, setSolanaConnection } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const { Connection } = await import('@solana/web3.js');
      const mockConnection = new Connection('https://api.mainnet-beta.solana.com');
      setSolanaConnection(mockConnection);

      const result = await fetchSolanaStakingPositions(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        100,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(0);
    });

    it('should skip non-delegated stake accounts', async () => {
      mockGetParsedProgramAccounts.mockResolvedValue([
        {
          pubkey: new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          account: {
            data: {
              program: 'stake',
              parsed: {
                type: 'initialized', // Not delegated
                info: {},
              },
            },
          },
        },
        {
          pubkey: new PublicKey('9WzDXwBbmPgP1XxJqTmFfjEVTt9e8ZVqGG1KfJd1xZUU'),
          account: {
            data: {
              program: 'stake',
              parsed: {
                type: 'delegated',
                info: {
                  stake: {
                    delegation: {
                      stake: '5000000000',
                      voter: 'Validator1',
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      const { fetchSolanaStakingPositions, setSolanaConnection } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const { Connection } = await import('@solana/web3.js');
      const mockConnection = new Connection('https://api.mainnet-beta.solana.com');
      setSolanaConnection(mockConnection);

      const result = await fetchSolanaStakingPositions(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        100,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      // Should only include the delegated account
      expect(result.value).toHaveLength(1);
    });

    it('should return failure for invalid Solana address', async () => {
      const { fetchSolanaStakingPositions } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const result = await fetchSolanaStakingPositions('not-a-valid-address', 100);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');

      expect(result.error.message).toContain('Invalid Solana address');
    });

    it('should return failure on RPC exception', async () => {
      mockGetParsedProgramAccounts.mockRejectedValue(new Error('RPC rate limited'));

      const { fetchSolanaStakingPositions, setSolanaConnection } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const { Connection } = await import('@solana/web3.js');
      const mockConnection = new Connection('https://api.mainnet-beta.solana.com');
      setSolanaConnection(mockConnection);

      const result = await fetchSolanaStakingPositions(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        100,
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');

      expect(result.error.message).toContain('RPC rate limited');
    });

    it('should skip accounts with zero stake', async () => {
      mockGetParsedProgramAccounts.mockResolvedValue([
        {
          pubkey: new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          account: {
            data: {
              program: 'stake',
              parsed: {
                type: 'delegated',
                info: {
                  stake: {
                    delegation: {
                      stake: '0',
                      voter: 'Validator1',
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      const { fetchSolanaStakingPositions, setSolanaConnection } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const { Connection } = await import('@solana/web3.js');
      const mockConnection = new Connection('https://api.mainnet-beta.solana.com');
      setSolanaConnection(mockConnection);

      const result = await fetchSolanaStakingPositions(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        100,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(0);
    });
  });

  // ── Aggregate fetcher ──────────────────────────────────────────────────

  describe('fetchStakingPositions', () => {
    it('should delegate to EVM fetcher for evm chain type', async () => {
      const { createPublicClient } = await import('viem');

      const mockClient = createMockPublicClient([
        { status: 'success', result: BigInt('1000000000000000000') },
        { status: 'success', result: BigInt(0) },
        { status: 'success', result: BigInt(0) },
      ]);

      vi.mocked(createPublicClient).mockReturnValue(mockClient as never);

      const { fetchStakingPositions, setEvmClient } = await import(
        '@infrastructure/wallet/staking-service'
      );

      setEvmClient(mockClient as never);

      const result = await fetchStakingPositions({
        address: '0x1234567890123456789012345678901234567890',
        chainType: 'evm',
        chainId: 1,
        tokenPrices: { steth: 2000 },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.chain).toBe('evm');
    });

    it('should delegate to Solana fetcher for solana chain type', async () => {
      mockGetParsedProgramAccounts.mockResolvedValue([
        {
          pubkey: new PublicKey('7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK'),
          account: {
            data: {
              program: 'stake',
              parsed: {
                type: 'delegated',
                info: {
                  stake: {
                    delegation: {
                      stake: '5000000000',
                      voter: 'Validator1',
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      const { fetchStakingPositions, setSolanaConnection } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const { Connection } = await import('@solana/web3.js');
      const mockConnection = new Connection('https://api.mainnet-beta.solana.com');
      setSolanaConnection(mockConnection);

      const result = await fetchStakingPositions({
        address: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
        chainType: 'solana',
        chainId: 'solana-mainnet',
        tokenPrices: { sol: 100, solana: 100 },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected success');

      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.chain).toBe('solana');
    });

    it('should return failure for unsupported chain type', async () => {
      const { fetchStakingPositions } = await import(
        '@infrastructure/wallet/staking-service'
      );

      const result = await fetchStakingPositions({
        address: 'some-address',
        chainType: 'sui' as 'evm' | 'solana',
        chainId: 'sui-mainnet',
        tokenPrices: {},
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');

      expect(result.error.message).toContain('Staking not supported');
    });
  });
});
