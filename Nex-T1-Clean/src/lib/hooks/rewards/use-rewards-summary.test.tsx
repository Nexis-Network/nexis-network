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

import { useRewardsSummary } from "./use-rewards-summary";

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

describe("useRewardsSummary", () => {
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

  it("does not fetch rewards summary when the user is not authenticated", async () => {
    useAuthContextMock.mockReturnValue({
      isAuthenticated: false,
      session: null,
    });

    renderHook(() => useRewardsSummary(), {
      wrapper: createWrapper(),
    });

    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches rewards summary once auth is available", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            xp: {
              totalXp: 1200,
              level: 4,
              tier: {
                tier: 2,
                badgePath: "/badge.svg",
                minXp: 1000,
                nextMinXp: 2500,
                xpToNextTier: 1300,
                tierProgressPct: 48,
              },
            },
            dailyClaim: {
              canClaim: true,
              lastClaimDate: "2026-03-03",
              currentStreak: 5,
              nextReward: 75,
            },
            dailyQuest: {
              canClaimToday: true,
              rewardXp: 50,
              lastClaimDate: "2026-03-02",
            },
            referrals: {
              inviteCode: "NEX-QUEST",
              inviteUrl: "https://nex-t1.ai/auth?view=sign-up&invite=NEX-QUEST",
              totalReferrals: 12,
              signupCount: 10,
              proBonusCount: 1,
              ultraBonusCount: 1,
              totalReferralXp: 540,
            },
            quests: [],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { result } = renderHook(() => useRewardsSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.xp.totalXp).toBe(1200);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rewards/summary",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        credentials: "include",
      }),
    );
  });
});
