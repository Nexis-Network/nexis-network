/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useAuthContextMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/auth/use-auth-context", () => ({
  useAuthContext: () => useAuthContextMock(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: getSessionMock,
    },
  }),
}));

import { useSessionKeys } from "./use-automation-api";

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

describe("useAutomationApi", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    useAuthContextMock.mockReturnValue({
      isAuthenticated: true,
    });
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "auth-token",
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("parses the standard api envelope for session key queries", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: "00000000-0000-0000-0000-000000000101",
                userId: "00000000-0000-0000-0000-000000000102",
                agentIdentifier: "agent-1",
                chainSlug: "base",
                walletAddress: "0x0000000000000000000000000000000000000001",
                sessionKeyPublic: "session-public-key",
                scopes: ["bridge", "buy"],
                expiresAt: "2026-04-01T00:00:00.000Z",
                revokedAt: null,
                revokedReason: null,
                metadata: {
                  source: "test",
                },
                createdAt: "2026-03-01T00:00:00.000Z",
                updatedAt: "2026-03-02T00:00:00.000Z",
              },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const { result } = renderHook(() => useSessionKeys(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data?.[0]).toMatchObject({
      id: "00000000-0000-0000-0000-000000000101",
      chainSlug: "base",
      metadata: {
        source: "test",
      },
      scopes: ["bridge", "buy"],
    });
    expect(result.current.data?.[0].createdAt).toBeInstanceOf(Date);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/automation/session-keys",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer auth-token",
        }),
      }),
    );
  });
});
