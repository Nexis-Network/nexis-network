"use client";

import { useCallback, useEffect, useState } from "react";
import { ExchangeConnection } from "@/components/settings/trading/exchange-connections-card";

type UseExchangeConnectionsOptions = {
  enabled?: boolean;
};

export function useExchangeConnections(options: UseExchangeConnectionsOptions = {}) {
  const { enabled = true } = options;
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!enabled) {
      setConnections([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/trading/exchanges");
      
      if (res.status === 401) {
        // Not authenticated, just return empty
        setConnections([]);
        setError(null);
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch connections: ${res.statusText}`);
      }

      const data = await res.json();
      setConnections(data.connections || []);
      setError(null);
    } catch (err) {
      // Don't log expected auth errors or aborts
      if (err instanceof Error && err.name !== 'AbortError') {
         console.warn("Error fetching exchange connections:", err);
         setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  return { 
    connections, 
    loading, 
    error,
    refresh: fetchConnections 
  };
}
