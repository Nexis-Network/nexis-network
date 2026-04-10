/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useAuthContextMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/auth/use-auth-context", () => ({
  useAuthContext: () => useAuthContextMock(),
}));

import { useUserWallets } from "./use-user-wallets";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createWrapper() {
  const queryClient = createQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useUserWallets", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    useAuthContextMock.mockReturnValue({
      isAuthenticated: true,
      session: {
        access_token: "auth-token",
      },
      user: {
        id: "user-123",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not fetch user wallets until the user is authenticated", async () => {
    useAuthContextMock.mockReturnValue({
      isAuthenticated: false,
      session: null,
      user: null,
    });

    renderHook(() => useUserWallets(), {
      wrapper: createWrapper(),
    });

    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches user wallets with the current auth context when auth is ready", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          wallets: [
            {
              walletId: "cdp:evm:smart",
              walletType: "embedded",
              providerName: "Nex Wallet (EVM)",
              address: "0xabc123",
              topAssets: [],
              topChains: [],
              metadata: {
                walletType: "cdp",
                provider: "cdp",
                kind: "evm",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { result } = renderHook(() => useUserWallets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.wallets).toHaveLength(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user/wallets",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer auth-token",
        }),
      }),
    );
  });
});
