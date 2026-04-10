/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWalletAssets } from "./use-wallet-assets";

function createJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function requireResponseResolver(
  resolver: ((value: Response) => void) | null,
  label: string,
): (value: Response) => void {
  if (!resolver) {
    throw new Error(`${label} resolver was not initialized`);
  }

  return resolver;
}

describe("useWalletAssets", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads Solana assets through /api/wallets/portfolio", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        tokens: [
          {
            id: "So11111111111111111111111111111111111111112",
            address: "So11111111111111111111111111111111111111112",
            symbol: "SOL",
            name: "Solana",
            balance: "1000000000",
            decimals: 9,
            balanceFormatted: "1",
            priceUsd: 120,
            valueUsd: 120,
            logoUrl: null,
            kind: "native",
          },
        ],
      }),
    );

    const { result } = renderHook(() => useWalletAssets("SoLanaAddress", "solana"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.assets).toHaveLength(1);
    expect(result.current.assets[0]?.symbol).toBe("SOL");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wallets/portfolio?address=SoLanaAddress&chainFamily=solana",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }),
    );
  });

  it("surfaces API errors from /api/wallets/portfolio", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: "Failed to fetch portfolio data",
          },
          500,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: "Failed to fetch portfolio data",
          },
          500,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: "Failed to fetch portfolio data",
          },
          500,
        ),
      );

    const { result } = renderHook(() => useWalletAssets("SoLanaAddress", "solana"));

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to fetch portfolio data");
    });
  });

  it("retries on 429 and succeeds", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: "rate_limited",
          },
          429,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          tokens: [
            {
              id: "So11111111111111111111111111111111111111112",
              address: "So11111111111111111111111111111111111111112",
              symbol: "SOL",
              name: "Solana",
              balance: "1000000000",
              decimals: 9,
              balanceFormatted: "1",
              priceUsd: 120,
              valueUsd: 120,
              logoUrl: null,
              kind: "native",
            },
          ],
        }),
      );

    const { result } = renderHook(() => useWalletAssets("SoLanaAddress", "solana"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.assets).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    randomSpy.mockRestore();
  });

  it("preserves an exact uiAmount string for large evm balances", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      const chainId = new URL(url, "http://localhost").searchParams.get("chainId");

      if (chainId === "0x1") {
        return createJsonResponse({
          native: {
            balance: "123456789012345678901234567890123456789",
          },
          tokens: [],
        });
      }

      return createJsonResponse({
        native: null,
        tokens: [],
      });
    });

    const { result } = renderHook(() => useWalletAssets("0xabc", "evm"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.assets[0]).toMatchObject({
      id: "native-0x1",
      uiAmountString: "123456789012345678901.234567890123456789",
    });
  });

  it("ignores stale responses when the wallet address changes", async () => {
    let resolveFirst: ((value: Response) => void) | null = null;
    let resolveSecond: ((value: Response) => void) | null = null;

    fetchMock.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("address=wallet-a")) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      }

      if (url.includes("address=wallet-b")) {
        return new Promise<Response>((resolve) => {
          resolveSecond = resolve;
        });
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    const { result, rerender } = renderHook(
      ({ address }) => useWalletAssets(address, "solana"),
      {
        initialProps: {
          address: "wallet-a",
        },
      },
    );

    rerender({
      address: "wallet-b",
    });

    const resolveWalletB = requireResponseResolver(resolveSecond, "wallet-b");
    resolveWalletB(
      createJsonResponse({
        tokens: [
          {
            id: "wallet-b-token",
            address: "wallet-b-token",
            symbol: "BETA",
            name: "Wallet B Token",
            balance: "1000000000",
            decimals: 9,
            balanceFormatted: "1",
            priceUsd: 1,
            valueUsd: 1,
            logoUrl: null,
            kind: "token",
          },
        ],
      }),
    );

    await waitFor(() => {
      expect(result.current.assets[0]?.symbol).toBe("BETA");
    });

    const resolveWalletA = requireResponseResolver(resolveFirst, "wallet-a");
    resolveWalletA(
      createJsonResponse({
        tokens: [
          {
            id: "wallet-a-token",
            address: "wallet-a-token",
            symbol: "ALPHA",
            name: "Wallet A Token",
            balance: "1000000000",
            decimals: 9,
            balanceFormatted: "1",
            priceUsd: 1,
            valueUsd: 1,
            logoUrl: null,
            kind: "token",
          },
        ],
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.assets[0]?.symbol).toBe("BETA");
  });
});
