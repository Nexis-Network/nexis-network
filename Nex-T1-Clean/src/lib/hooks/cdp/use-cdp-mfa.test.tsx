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

import { useCdpMfa } from "./use-cdp-mfa";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
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

describe("useCdpMfa", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    useAuthContextMock.mockReturnValue({
      isAuthenticated: true,
      session: {
        access_token: "token-123",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not request MFA status before authentication is ready", async () => {
    useAuthContextMock.mockReturnValue({
      isAuthenticated: false,
      session: null,
    });

    renderHook(() => useCdpMfa(), {
      wrapper: createWrapper(),
    });

    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads MFA status when the user is authenticated", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            enabled: true,
            type: "totp",
            enrolledAt: "2026-03-07T12:00:00.000Z",
            pendingSetup: false,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { result } = renderHook(() => useCdpMfa(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cdp/auth/mfa/status",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
    expect(result.current.isEnabled).toBe(true);
  });
});
