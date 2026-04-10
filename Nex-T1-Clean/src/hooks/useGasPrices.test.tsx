/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGasPrices } from "./useGasPrices";

function createJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("useGasPrices", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    delete (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE;
    vi.unstubAllGlobals();
  });

  it("formats gas price in gwei when API returns a value", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        success: true,
        data: {
          chainId: 1,
          gasPriceWei: "1000000000",
          fetchedAt: Date.now(),
          cached: false,
        },
      }),
    );

    const { result, unmount } = renderHook(() => useGasPrices(1));

    await waitFor(() => {
      expect(result.current.formattedGas).toBe("1.00");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/prices/gas?chainId=1",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );

    unmount();
  });

  it("sets a controlled error when the API call fails", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Unable to fetch gas price",
          },
        },
        503,
      ),
    );

    const { result, unmount } = renderHook(() => useGasPrices(1));

    await waitFor(() => {
      expect(result.current.error).toBe("Unable to fetch gas price");
    });

    expect(result.current.formattedGas).toBe("-");
    unmount();
  });

  it("skips gas polling in non-production test mode", () => {
    (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE = true;

    const { result, unmount } = renderHook(() => useGasPrices(1));

    expect(result.current.formattedGas).toBe("-");
    expect(result.current.error).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    unmount();
  });
});
