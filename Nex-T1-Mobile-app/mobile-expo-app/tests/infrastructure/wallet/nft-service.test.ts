/**
 * Unit tests for NFT Service.
 *
 * Validates the NFT fetching service that wraps the Moralis API for EVM
 * chains and provides stubs for Solana. Tests mock `global.fetch` which
 * is pre-configured in `tests/setup.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @config/env
// ---------------------------------------------------------------------------

vi.mock('@config/env', () => ({
  getEnv: vi.fn(() => ({
    MORALIS_API_KEY: 'test-moralis-api-key',
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2';

function mockFetchResponse(body: unknown, status = 200): void {
  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

function createMoralisNFTResult(overrides: Partial<{
  readonly token_id: string;
  readonly token_address: string;
  readonly contract_type: string;
  readonly name: string;
  readonly metadata: string | null;
}> = {}): {
  readonly token_id: string;
  readonly token_address: string;
  readonly contract_type: string;
  readonly name: string;
  readonly symbol: string;
  readonly token_uri: string | null;
  readonly metadata: string | null;
  readonly amount: string;
  readonly owner_of: string;
  readonly block_number: string;
  readonly block_number_minted: string | null;
  readonly possible_spam: boolean;
  readonly verified_collection: boolean;
} {
  return {
    token_id: '1234',
    token_address: '0x1234567890abcdef1234567890abcdef12345678',
    contract_type: 'ERC721',
    name: 'Test Collection',
    symbol: 'TEST',
    token_uri: 'https://example.com/metadata/1234',
    metadata: JSON.stringify({
      name: 'Test NFT #1234',
      description: 'A test NFT for unit testing',
      image: 'ipfs://QmTest123',
      attributes: [
        { trait_type: 'Background', value: 'Blue' },
        { trait_type: 'Rarity', value: 'Rare' },
      ],
    }),
    amount: '1',
    owner_of: '0xowner123',
    block_number: '12345678',
    block_number_minted: '12345000',
    possible_spam: false,
    verified_collection: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NFT Service', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  // ========================================================================
  // fetchEvmNFTs
  // ========================================================================

  describe('fetchEvmNFTs', () => {
    it('should return correctly mapped NFTs from Moralis response', async () => {
      const moralisResponse = {
        status: 'SYNCED',
        page: 0,
        page_size: 50,
        cursor: null,
        result: [
          createMoralisNFTResult(),
          createMoralisNFTResult({
            token_id: '5678',
            contract_type: 'ERC1155',
            metadata: JSON.stringify({
              name: 'Another NFT',
              description: 'Second test NFT',
              image: 'https://example.com/image.png',
            }),
          }),
        ],
      };

      mockFetchResponse(moralisResponse);

      const { fetchEvmNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      const result = await fetchEvmNFTs('0xTestAddress', 1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);

        // First NFT
        const firstNFT = result.value[0];
        expect(firstNFT).toBeDefined();
        if (firstNFT) {
          expect(firstNFT.tokenId).toBe('1234');
          expect(firstNFT.contractAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
          expect(firstNFT.chain).toBe('evm');
          expect(firstNFT.chainId).toBe(1);
          expect(firstNFT.name).toBe('Test NFT #1234');
          expect(firstNFT.description).toBe('A test NFT for unit testing');
          expect(firstNFT.imageUrl).toBe('https://ipfs.io/ipfs/QmTest123');
          expect(firstNFT.collectionName).toBe('Test Collection');
          expect(firstNFT.standard).toBe('ERC-721');
          expect(firstNFT.attributes).toHaveLength(2);
          expect(firstNFT.attributes?.[0]).toEqual({
            traitType: 'Background',
            value: 'Blue',
          });
        }

        // Second NFT (ERC-1155)
        const secondNFT = result.value[1];
        expect(secondNFT).toBeDefined();
        if (secondNFT) {
          expect(secondNFT.tokenId).toBe('5678');
          expect(secondNFT.standard).toBe('ERC-1155');
          expect(secondNFT.name).toBe('Another NFT');
          expect(secondNFT.imageUrl).toBe('https://example.com/image.png');
        }
      }

      // Verify fetch was called with correct URL and headers
      const fetchCalls = vi.mocked(global.fetch).mock.calls;
      expect(fetchCalls.length).toBe(1);
      const fetchCall = fetchCalls[0];
      if (!fetchCall) throw new Error('Expected fetch to be called');

      const url = new URL(fetchCall[0] as string);
      expect(url.origin + url.pathname).toBe(`${MORALIS_BASE}/0xTestAddress/nft`);
      expect(url.searchParams.get('chain')).toBe('0x1');
      expect(url.searchParams.get('format')).toBe('decimal');
      expect(url.searchParams.get('limit')).toBe('50');

      const options = fetchCall[1] as RequestInit | undefined;
      expect(options?.headers).toMatchObject({
        'Accept': 'application/json',
        'X-API-Key': 'test-moralis-api-key',
      });
    });

    it('should handle empty result array', async () => {
      const moralisResponse = {
        status: 'SYNCED',
        page: 0,
        page_size: 50,
        cursor: null,
        result: [],
      };

      mockFetchResponse(moralisResponse);

      const { fetchEvmNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      const result = await fetchEvmNFTs('0xEmptyWallet', 137);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should return WalletError on HTTP error response', async () => {
      mockFetchResponse({ message: 'Rate limit exceeded' }, 429);

      const { fetchEvmNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      const result = await fetchEvmNFTs('0xTestAddress', 1);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('WALLET_ERROR');
        expect(result.error.message).toContain('Moralis API error');
        expect(result.error.message).toContain('429');
        expect(result.error.walletAddress).toBe('0xTestAddress');
      }
    });

    it('should return WalletError on network error', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('Network connection failed'),
      );

      const { fetchEvmNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      const result = await fetchEvmNFTs('0xTestAddress', 1);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('WALLET_ERROR');
        expect(result.error.message).toContain('Network connection failed');
        expect(result.error.walletAddress).toBe('0xTestAddress');
      }
    });

    it('should handle malformed metadata JSON gracefully', async () => {
      const moralisResponse = {
        status: 'SYNCED',
        page: 0,
        page_size: 50,
        cursor: null,
        result: [
          createMoralisNFTResult({
            metadata: 'not valid json {{{',
          }),
        ],
      };

      mockFetchResponse(moralisResponse);

      const { fetchEvmNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      const result = await fetchEvmNFTs('0xTestAddress', 1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        const nft = result.value[0];
        expect(nft).toBeDefined();
        if (nft) {
          // Should fall back to token name when metadata is invalid
          expect(nft.name).toBe('Test Collection');
          expect(nft.description).toBeUndefined();
          expect(nft.imageUrl).toBeUndefined();
          expect(nft.attributes).toBeUndefined();
        }
      }
    });

    it('should handle null metadata gracefully', async () => {
      const moralisResponse = {
        status: 'SYNCED',
        page: 0,
        page_size: 50,
        cursor: null,
        result: [
          createMoralisNFTResult({
            token_id: '9999',
            name: 'NoMeta Collection',
            metadata: null,
          }),
        ],
      };

      mockFetchResponse(moralisResponse);

      const { fetchEvmNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      const result = await fetchEvmNFTs('0xTestAddress', 1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        const nft = result.value[0];
        expect(nft).toBeDefined();
        if (nft) {
          expect(nft.name).toBe('NoMeta Collection');
          expect(nft.tokenId).toBe('9999');
        }
      }
    });

    it('should convert different chain IDs to hex format', async () => {
      mockFetchResponse({
        status: 'SYNCED',
        page: 0,
        page_size: 50,
        cursor: null,
        result: [],
      });

      const { fetchEvmNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      await fetchEvmNFTs('0xTestAddress', 137);

      const fetchCalls = vi.mocked(global.fetch).mock.calls;
      const fetchCall = fetchCalls[0];
      if (!fetchCall) throw new Error('Expected fetch to be called');

      const url = new URL(fetchCall[0] as string);
      expect(url.searchParams.get('chain')).toBe('0x89'); // 137 in hex
    });

    it('should return WalletError when API key is missing', async () => {
      // Override the mock to return no API key
      const { getEnv } = await import('@config/env');
      vi.mocked(getEnv).mockReturnValueOnce({
        MORALIS_API_KEY: undefined,
      } as ReturnType<typeof getEnv>);

      const { fetchEvmNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      const result = await fetchEvmNFTs('0xTestAddress', 1);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Moralis API key is not configured');
      }
    });
  });

  // ========================================================================
  // fetchSolanaNFTs
  // ========================================================================

  describe('fetchSolanaNFTs', () => {
    it('should return empty array (stub implementation)', async () => {
      const { fetchSolanaNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      const result = await fetchSolanaNFTs(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
        expect(result.value).toHaveLength(0);
      }
    });

    it('should not call fetch (stub implementation)', async () => {
      const { fetchSolanaNFTs } = await import(
        '@infrastructure/wallet/nft-service'
      );
      await fetchSolanaNFTs('SolanaAddress123');

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
