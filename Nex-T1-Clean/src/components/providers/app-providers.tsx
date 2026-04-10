"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
// NOTE: persister is initialized synchronously in useState to avoid a
// double-mount caused by a useEffect-driven provider swap.
import { QueryClientProvider } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  type PersistQueryClientProviderProps,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Toaster } from "@/components/ui/sonner";
import { ChunkReloadListener } from "@/components/providers/chunk-reload-listener";
import { createAppQueryClient } from "@/components/providers/query-client";
import { SupabaseAuthBoundary } from "@/components/providers/supabase-auth-provider";
import { WalletProvidersBoundary } from "@/components/providers/wallet-providers-boundary";
import { usePathname } from "next/navigation";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";
import { logger } from '@/lib/logger';

type AppProvidersProps = {
  children: ReactNode;
};

const QUERY_CACHE_STORAGE_KEY = "nex-query-cache-v1";
const QUERY_CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const MARKETING_EXACT_ROUTES = new Set([
  "/",
  "/about",
  "/brand-guidelines",
  "/careers",
  "/ecosystem",
  "/home",
  "/landing-v2",
  "/launchpad",
  "/legal-compliance",
  "/privacy",
  "/terms",
  "/nzt",
]);
const MARKETING_PREFIXES = ["/blog", "/pricing"];

type PersistedQuery = NonNullable<
  NonNullable<PersistedClient["clientState"]["queries"]>
>[number];

// Solana + Sui providers remain because they are independent wallet ecosystems
// used elsewhere in the app.

function sanitizePersistedClient(client: PersistedClient): PersistedClient {
  const queries = client.clientState?.queries;
  if (!queries?.length) {
    return client;
  }

  const sanitizedQueries = queries
    .filter((query) => query.state?.status === "success")
    .map((query) => {
      const { promise: _ignoredPromise, ...rest } = query as PersistedQuery & { promise?: UntypedJson };
      return rest;
    });

  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: sanitizedQueries,
    },
  } satisfies PersistedClient;
}

const createEmptyPersistedClient = (): PersistedClient => ({
  buster: "",
  timestamp: Date.now(),
  clientState: {
    queries: [],
    mutations: [],
  },
});

const isPersistedClient = (value: UntypedJson): value is PersistedClient => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PersistedClient>;
  return (
    typeof candidate.timestamp === "number" &&
    typeof candidate.buster === "string" &&
    typeof candidate.clientState === "object" &&
    candidate.clientState !== null
  );
};

const isMarketingRoute = (pathname: string | null): boolean => {
  if (!pathname) return false;
  if (MARKETING_EXACT_ROUTES.has(pathname)) return true;
  if (MARKETING_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  return /^\/nex-(cloud|console|grid|mcp|runtime|t1|verify)(\/|$)/.test(pathname);
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createAppQueryClient());
  const pathname = usePathname();
  const [persister] = useState<Persister | null>(() => {
    if (typeof window === "undefined") return null;
    return createSyncStoragePersister({
      key: QUERY_CACHE_STORAGE_KEY,
      storage: window.localStorage,
      serialize: (client) => JSON.stringify(sanitizePersistedClient(client)),
      deserialize: (cached) => {
        try {
          const parsed = JSON.parse(cached) as PersistedClient | undefined;
          if (!isPersistedClient(parsed)) {
            throw new Error("Invalid persisted client payload");
          }
          return sanitizePersistedClient(parsed);
        } catch (error) {
          logger.warn("query_cache_deserialize_failed", error);
          try {
            window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
          } catch {
            // ignore storage errors
          }
          return createEmptyPersistedClient();
        }
      },
    });
  });

  const persistOptions = useMemo<PersistQueryClientProviderProps["persistOptions"] | null>(() => {
    if (!persister) {
      return null;
    }
    return {
      persister,
      maxAge: QUERY_CACHE_MAX_AGE_MS,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => query.meta?.persist === true && query.state.status === "success",
      },
    } satisfies PersistQueryClientProviderProps["persistOptions"];
  }, [persister]);
  useEffect(() => {
    try {
      (globalThis as UntypedJson as { litDisableWarning?: boolean }).litDisableWarning = true;
    } catch {
      // no-op if globalThis is not writable
    }
  }, []);

  // CDP hooks can be used in shared UI (e.g. header) even on marketing routes.
  // Ensure wallet providers are present whenever CDP is enabled.
  const shouldWrapWalletProviders = CDP_EMBEDDED_ENABLED || !isMarketingRoute(pathname);

  const providerWrappedChildren = useMemo(() => {
    return (
      <SupabaseAuthBoundary>
        {shouldWrapWalletProviders ? (
          <WalletProvidersBoundary>{children}</WalletProvidersBoundary>
        ) : (
          children
        )}
      </SupabaseAuthBoundary>
    );
  }, [shouldWrapWalletProviders, children]);

  const withWalletBoundary = useMemo(
    () => (
      <>
        <ChunkReloadListener />
        {providerWrappedChildren}
        <Toaster position="top-right" richColors />
      </>
    ),
    [providerWrappedChildren],
  );

  if (persistOptions) {
    return (
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        {withWalletBoundary}
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {withWalletBoundary}
    </QueryClientProvider>
  );
}
