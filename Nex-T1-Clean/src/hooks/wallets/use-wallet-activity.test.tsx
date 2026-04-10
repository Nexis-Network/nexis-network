/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWalletActivity } from "./use-wallet-activity";

vi.mock("@/lib/chain-adapter/chain-adapter", () => ({
  getChainAdapter: () => ({
    getExplorerTxUrl: (hash: string) => `https://explorer.local/tx/${hash}`,
  }),
}));

function createJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("useWalletActivity", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads EVM wallet activity through /api/wallets/transactions", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        transactions: [
          {
            hash: "0xhash",
            from_address: "0xabc",
            to_address: "0xdef",
            value: "1000",
            block_timestamp: "2026-01-01T00:00:00.000Z",
            receipt_status: "1",
          },
        ],
      }),
    );

    const { result } = renderHook(() => useWalletActivity("0xabc", "evm", "0x1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0]?.explorerUrl).toBe("https://explorer.local/tx/0xhash");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wallets/transactions?address=0xabc&chainFamily=evm&chainId=0x1&limit=25",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }),
    );
  });

  it("surfaces API transaction errors", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          error: "Failed to fetch transaction history",
        },
        500,
      ),
    );

    const { result } = renderHook(() => useWalletActivity("0xabc", "evm", "0x1"));

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to fetch transaction history");
    });
  });
});
