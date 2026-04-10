/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChartData } from "./use-chart-data";

function createJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("useChartData", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps OHLC rendering when market chart returns 401", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse([
          [1710000000000, 100, 105, 95, 102],
          [1710003600000, 102, 108, 101, 107],
        ]),
      )
      .mockResolvedValueOnce(createJsonResponse({ error: "unauthorized" }, 401));

    const { result } = renderHook(() => useChartData("ETH", "1D"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.points).toHaveLength(2);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.points[0]?.volume).toBe(0);
    expect(result.current.points[1]?.volume).toBe(0);
  });

  it("reports an error when OHLC request fails", async () => {
    fetchMock
      .mockResolvedValueOnce(createJsonResponse({ error: "upstream failed" }, 500))
      .mockResolvedValueOnce(createJsonResponse({ prices: [], total_volumes: [] }, 200));

    const { result } = renderHook(() => useChartData("ETH", "7D"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("Failed to load chart data");
    });

    expect(result.current.points).toEqual([]);
  });

  it("aborts in-flight requests when unmounted", async () => {
    const capturedSignals: AbortSignal[] = [];
    fetchMock.mockImplementation((_input, init) => {
      if (init?.signal) capturedSignals.push(init.signal);
      return new Promise<Response>(() => {
        // Intentionally unresolved: we only assert cleanup abort behavior.
      });
    });

    const { unmount } = renderHook(() => useChartData("ETH", "1D"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(capturedSignals).toHaveLength(2);
    expect(capturedSignals.every((signal) => signal.aborted === false)).toBe(true);

    unmount();

    expect(capturedSignals.every((signal) => signal.aborted)).toBe(true);
  });
});
