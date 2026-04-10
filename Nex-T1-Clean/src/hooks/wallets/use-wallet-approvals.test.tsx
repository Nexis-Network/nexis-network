/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWalletApprovals } from "./use-wallet-approvals";

function createJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("useWalletApprovals", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads EVM approvals through /api/wallets/approvals", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        approvals: [
          {
            token_address: "0xtoken",
            token_symbol: "USDC",
            token_name: "USD Coin",
            token_logo: "https://cdn.local/usdc.png",
            spender_address: "0xspender",
            spender_label: "Uniswap Router",
            value: "1000",
          },
        ],
      }),
    );

    const { result } = renderHook(() => useWalletApprovals("0xabc", "evm", "0x1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.approvals).toHaveLength(1);
    expect(result.current.approvals[0]?.tokenSymbol).toBe("USDC");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wallets/approvals?address=0xabc&chainId=0x1",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }),
    );
  });

  it("surfaces approvals API errors", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          error: "Failed to fetch approvals",
        },
        500,
      ),
    );

    const { result } = renderHook(() => useWalletApprovals("0xabc", "evm", "0x1"));

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to fetch approvals");
    });
  });
});
