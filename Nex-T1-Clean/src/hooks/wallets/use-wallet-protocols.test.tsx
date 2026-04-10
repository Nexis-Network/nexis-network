/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWalletProtocols } from "./use-wallet-protocols";

function createJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("useWalletProtocols", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads EVM protocols through /api/wallets/protocols", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        protocols: [
          {
            protocol_id: "aave",
            protocol_name: "Aave",
            protocol_logo: "https://cdn.local/aave.png",
            net_usd_value: 200,
            protocol_url: "https://aave.com",
          },
        ],
        totalUsd: 200,
      }),
    );

    const { result } = renderHook(() => useWalletProtocols("0xabc", "evm", "0x1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.protocols).toHaveLength(1);
    expect(result.current.totalUsd).toBe(200);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wallets/protocols?address=0xabc&chainId=0x1",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }),
    );
  });

  it("surfaces protocol API errors", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          error: "Failed to fetch protocols",
        },
        500,
      ),
    );

    const { result } = renderHook(() => useWalletProtocols("0xabc", "evm", "0x1"));

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to fetch protocols");
    });
  });
});
