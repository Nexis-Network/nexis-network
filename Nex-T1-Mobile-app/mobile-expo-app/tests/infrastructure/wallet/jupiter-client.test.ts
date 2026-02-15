/**
 * Unit tests for JupiterClient.
 *
 * Validates the thin wrapper around the Jupiter Lite API for DEX swap
 * quotes and transaction building. Tests mock `global.fetch` which is
 * pre-configured in `tests/setup.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JUPITER_BASE = 'https://lite-api.jup.ag/swap';

function mockFetchResponse(body: unknown, status = 200): void {
  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JupiterClient', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  // ── getQuote ─────────────────────────────────────────────────────────

  describe('getQuote', () => {
    it('should call Jupiter /quote with correct query params', async () => {
      const quoteResponse = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: '1000000000',
        outAmount: '35000000',
        priceImpactPct: '0.01',
        routePlan: [{ swapInfo: {} }],
      };
      mockFetchResponse(quoteResponse);

      const { JupiterClient } = await import(
        '@infrastructure/wallet/jupiter-client'
      );
      const client = new JupiterClient();
      const result = await client.getQuote({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000000',
        slippageBps: 50,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.inputMint).toBe(
          'So11111111111111111111111111111111111111112',
        );
        expect(result.value.outputAmount).toBe('35000000');
      }

      // Verify fetch was called with the correct URL
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]!;
      const url = new URL(fetchCall[0] as string);
      expect(url.origin + url.pathname).toBe(`${JUPITER_BASE}/quote`);
      expect(url.searchParams.get('inputMint')).toBe(
        'So11111111111111111111111111111111111111112',
      );
      expect(url.searchParams.get('outputMint')).toBe(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      );
      expect(url.searchParams.get('amount')).toBe('1000000000');
      expect(url.searchParams.get('slippageBps')).toBe('50');
      expect(url.searchParams.get('maxAccounts')).toBe('33');
    });

    it('should return failure on HTTP error', async () => {
      mockFetchResponse({ error: 'Bad request' }, 400);

      const { JupiterClient } = await import(
        '@infrastructure/wallet/jupiter-client'
      );
      const client = new JupiterClient();
      const result = await client.getQuote({
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

    it('should return failure on network exception', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('Network timeout'),
      );

      const { JupiterClient } = await import(
        '@infrastructure/wallet/jupiter-client'
      );
      const client = new JupiterClient();
      const result = await client.getQuote({
        inputMint: 'SOL',
        outputMint: 'USDC',
        amount: '1000',
        slippageBps: 50,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Network timeout');
      }
    });
  });

  // ── buildSwapTransaction ─────────────────────────────────────────────

  describe('buildSwapTransaction', () => {
    it('should POST to Jupiter /swap with quoteResponse and userPublicKey', async () => {
      const swapResponse = {
        swapTransaction: 'base64EncodedTransaction...',
      };
      mockFetchResponse(swapResponse);

      const { JupiterClient } = await import(
        '@infrastructure/wallet/jupiter-client'
      );
      const client = new JupiterClient();
      const quoteResponse = {
        inputMint: 'SOL',
        outputMint: 'USDC',
        inAmount: '1000',
        outAmount: '35',
        priceImpactPct: '0.01',
        routePlan: [],
      };

      const result = await client.buildSwapTransaction(
        quoteResponse,
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('base64EncodedTransaction...');
      }

      // Verify POST request details
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]!;
      expect(fetchCall[0]).toBe(`${JUPITER_BASE}/swap`);
      const options = fetchCall[1]! as RequestInit;
      expect(options.method).toBe('POST');
      expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
      const body = JSON.parse(options.body as string);
      expect(body.quoteResponse).toEqual(quoteResponse);
      expect(body.userPublicKey).toBe(
        '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
      );
    });

    it('should return failure on HTTP error', async () => {
      mockFetchResponse({ error: 'Server error' }, 500);

      const { JupiterClient } = await import(
        '@infrastructure/wallet/jupiter-client'
      );
      const client = new JupiterClient();
      const result = await client.buildSwapTransaction(
        { some: 'quote' },
        'pubkey',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('JUPITER_SWAP_ERROR');
      }
    });

    it('should return failure on network exception', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('CORS error'));

      const { JupiterClient } = await import(
        '@infrastructure/wallet/jupiter-client'
      );
      const client = new JupiterClient();
      const result = await client.buildSwapTransaction(
        { some: 'quote' },
        'pubkey',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('CORS error');
      }
    });
  });
});
