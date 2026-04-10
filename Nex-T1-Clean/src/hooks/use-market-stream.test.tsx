/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMarketStream } from "./use-market-stream";
import { useMarketPricesStore } from "@/stores/use-market-prices";

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  onopen: ((this: EventSource, ev: Event) => unknown) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null;
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emitOpen() {
    this.onopen?.call(this as unknown as EventSource, new Event("open"));
  }

  emitMessage(payload: unknown) {
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);
    this.onmessage?.call(this as unknown as EventSource, new MessageEvent("message", { data }));
  }

  emitError() {
    this.onerror?.call(this as unknown as EventSource, new Event("error"));
  }
}

describe("useMarketStream", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
    vi.useFakeTimers();

    // Reset the Zustand store between tests
    useMarketPricesStore.setState({
      prices: {},
      subscribers: {},
      isConnected: false,
      _reconnectAttempt: 0,
      _resolvedMapping: {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("connects via shared store, processes updates, and disconnects when coins are cleared", () => {
    const { result, rerender } = renderHook(
      ({ coins }) => useMarketStream(coins),
      { initialProps: { coins: ["ethereum", "bitcoin", "ethereum"] } },
    );

    // The store debounces by 500ms before opening EventSource
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const source = MockEventSource.instances[0];
    expect(source).toBeDefined();
    expect(decodeURIComponent(source.url)).toContain("bitcoin,ethereum");

    act(() => {
      source.emitOpen();
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      source.emitMessage({ type: "update", data: { ethereum: { price: 1234.56 } } });
    });
    expect(result.current.data.ethereum?.price).toBe(1234.56);

    // Clear coins — triggers unsubscribe + cleanup grace period
    rerender({ coins: [] });

    // Advance past the 5s cleanup grace period
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(source.closed).toBe(true);
    expect(result.current.isConnected).toBe(false);
  });

  it("ignores late events after unmount without React setState warnings", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = renderHook(() => useMarketStream(["ethereum"]));

    // Advance past debounce to trigger connection
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const source = MockEventSource.instances[0];
    expect(source).toBeDefined();

    unmount();

    // Advance past cleanup grace period
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(source.closed).toBe(true);

    // Late events should not cause React warnings
    act(() => {
      source.emitMessage({ type: "update", data: { ethereum: { price: 1 } } });
      source.emitError();
    });

    const hasReactSetStateWarning = errorSpy.mock.calls.some((call) =>
      call.some((arg) => typeof arg === "string" && arg.includes("Can't perform a React state update")),
    );

    expect(hasReactSetStateWarning).toBe(false);
  });

  it("falls back to REST polling after repeated SSE transport failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              ethereum: { value: 2480.25 },
            },
          }),
        ),
      ),
    );

    const { result } = renderHook(() => useMarketStream(["ethereum"]));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    const source = MockEventSource.instances[0];
    expect(source).toBeDefined();

    act(() => {
      source.emitError();
    });
    act(() => {
      vi.advanceTimersByTime(2_100);
    });

    const retriedSource = MockEventSource.instances[1];
    expect(retriedSource).toBeDefined();

    await act(async () => {
      retriedSource.emitError();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/assets/prices?ids=ethereum",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result.current.data.ethereum?.price).toBe(2480.25);
  });
});
