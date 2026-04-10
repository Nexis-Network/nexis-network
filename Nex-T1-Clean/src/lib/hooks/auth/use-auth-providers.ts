"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  buildProviderMap,
  createSafeProviderFallbackMap,
  extractProviderConfigEntries,
  mergeProviderMaps,
  type SupabaseOAuthProviderId,
} from "@/lib/supabase/providers";

import { logger } from "@/lib/logger";
export type ProviderMap = Map<SupabaseOAuthProviderId, string>;

export function useAuthProviders() {
  const fallback = useMemo(() => createSafeProviderFallbackMap(), []);

  return useQuery<ProviderMap>({
    queryKey: ["auth", "providers"],
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: fallback,
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/providers", {
          cache: "force-cache",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          if (process.env.NODE_ENV !== "production" && response.status !== 404) {
            logger.warn("auth_provider_config_failed", { status: response.status });
          }
          return fallback;
        }

        const payload = await response.json().catch(() => null);
        const map = buildProviderMap(extractProviderConfigEntries(payload));
        return mergeProviderMaps(fallback, map);
      } catch {
        return fallback;
      }
    },
  });
}
