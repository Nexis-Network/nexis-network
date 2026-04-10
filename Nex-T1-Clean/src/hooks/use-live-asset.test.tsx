/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const subscribeMock = vi.fn();
const unsubscribeMock = vi.fn();

vi.mock("@/stores/use-market-prices", () => ({
  useMarketPricesStore: (selector: (state: {
    subscribe: typeof subscribeMock;
    unsubscribe: typeof unsubscribeMock;
    prices: Record<string, never>;
    isConnected: false;
  }) => unknown) =>
    selector({
      subscribe: subscribeMock,
      unsubscribe: unsubscribeMock,
      prices: {},
      isConnected: false,
    }),
}));

import { useLiveAsset } from "./use-live-asset";

describe("useLiveAsset", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    subscribeMock.mockReset();
    unsubscribeMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    delete (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE;
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("skips live subscriptions and polling in non-production test mode", () => {
    (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE = true;

    const { result, unmount } = renderHook(() => useLiveAsset("eth", 3210.45, "1", 4.5));

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current.price).toBe(3210.45);
    expect(result.current.change24h).toBe(4.5);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(subscribeMock).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeMock).not.toHaveBeenCalled();
  });
});
