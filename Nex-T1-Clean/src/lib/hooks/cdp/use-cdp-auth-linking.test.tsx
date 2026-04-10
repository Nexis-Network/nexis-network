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

import {
  normalizeLinkedMethodsResponse,
  useCdpAuthLinking,
} from "./use-cdp-auth-linking";

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

describe("useCdpAuthLinking", () => {
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

  it("normalizes legacy provider aliases into stable UI types", () => {
    expect(
      normalizeLinkedMethodsResponse({
        data: {
          methods: [
            {
              id: "1",
              type: "oauth:google",
              identifier: "user@example.com",
              linkedAt: "2026-03-07T12:00:00.000Z",
              isPrimary: true,
            },
            {
              id: "2",
              type: "twitter",
              identifier: "@nexis",
              linkedAt: "2026-03-07T12:05:00.000Z",
              isPrimary: false,
            },
          ],
        },
      }),
    ).toEqual([
      {
        id: "1",
        type: "google",
        identifier: "user@example.com",
        linkedAt: "2026-03-07T12:00:00.000Z",
        isPrimary: true,
      },
      {
        id: "2",
        type: "x",
        identifier: "@nexis",
        linkedAt: "2026-03-07T12:05:00.000Z",
        isPrimary: false,
      },
    ]);
  });

  it("does not fetch linked methods until the user is authenticated in the browser", async () => {
    useAuthContextMock.mockReturnValue({
      isAuthenticated: false,
      session: null,
    });

    renderHook(() => useCdpAuthLinking(), {
      wrapper: createWrapper(),
    });

    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a query error instead of crashing when methods is not an array", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { methods: "broken" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useCdpAuthLinking(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.methods).toEqual([]);
    expect(result.current.error?.message).toBe(
      "Linked methods response must contain an array",
    );
  });

  it("extracts API error messages from JSON error responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            message: "Database unavailable",
          },
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { result } = renderHook(() => useCdpAuthLinking(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Database unavailable");
  });
});
