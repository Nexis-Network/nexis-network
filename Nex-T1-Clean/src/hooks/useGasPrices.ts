"use client";

import { useEffect, useState } from "react";
import { formatGwei } from "viem";
import { base } from "viem/chains";

import { isNonProductionClientTestMode } from "@/lib/utils/is-non-production-client-test-mode";

type GasPriceApiResponse =
  | {
      success: true;
      data: {
        chainId: number;
        gasPriceWei: string;
        fetchedAt: number;
        cached: boolean;
      };
    }
  | {
      success: false;
      error?: {
        code?: string;
        message?: string;
      };
    };

export function useGasPrices(chainId: number = base.id) {
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [formattedGas, setFormattedGas] = useState<string>("-");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const testMode = isNonProductionClientTestMode();

  useEffect(() => {
    if (testMode) {
      setGasPrice(null);
      setFormattedGas("-");
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    let isFetching = false;
    const controller = new AbortController();

    const fetchGas = async () => {
      if (isFetching) return;

      isFetching = true;
      setIsLoading(true);

      try {
        const response = await fetch(`/api/prices/gas?chainId=${chainId}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        const payload = (await response.json().catch(() => null)) as GasPriceApiResponse | null;

        if (!response.ok || !payload || payload.success !== true) {
          const message =
            payload?.success === false
              ? payload.error?.message || "Unable to fetch gas price"
              : "Unable to fetch gas price";
          throw new Error(message);
        }

        const gasWei = BigInt(payload.data.gasPriceWei);
        if (isCancelled) return;

        setGasPrice(gasWei);
        setFormattedGas(Number(formatGwei(gasWei)).toFixed(2));
        setError(null);
      } catch (err: unknown) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          setFormattedGas("-");
        }
      } finally {
        isFetching = false;
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchGas();
    const interval = window.setInterval(() => {
      void fetchGas();
    }, 30_000);

    return () => {
      isCancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [chainId, testMode]);

  return { gasPrice, formattedGas, isLoading, error };
}
