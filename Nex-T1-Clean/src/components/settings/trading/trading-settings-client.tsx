"use client";

/**
 * Trading Settings Page Client
 * 
 * Domain: settings/trading
 * Responsibility: Client component for managing exchange connections
 */

import { useState, useEffect, useCallback } from "react";
import { ExchangeConnectionsCard, type ExchangeConnection } from "@/components/settings/trading";
import { logger } from "@/lib/logger";

export default function TradingSettingsClient() {
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/trading/exchanges");
      
      if (!res.ok) {
        throw new Error("Failed to fetch connections");
      }

      const data = await res.json();
      setConnections(data.connections || []);
    } catch (err) {
      logger.error("[TradingSettings] Fetch failed", err);
      setError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAdd = async (data: {
    exchangeId: string;
    label: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
    isTestnet: boolean;
    permissions: { spot: boolean; futures: boolean; withdraw: boolean };
  }) => {
    const res = await fetch("/api/trading/exchanges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add connection");
    }

    // Refresh the list
    await fetchConnections();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const res = await fetch("/api/trading/exchanges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: id, isActive }),
    });

    if (!res.ok) {
      throw new Error("Failed to update connection");
    }

    // Update local state
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive } : c))
    );
  };

  const handleRemove = async (id: string) => {
    const res = await fetch(`/api/trading/exchanges?id=${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to remove connection");
    }

    // Update local state
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <ExchangeConnectionsCard
      connections={connections}
      isLoading={isLoading}
      error={error}
      onAdd={handleAdd}
      onToggle={handleToggle}
      onRemove={handleRemove}
      onRefresh={fetchConnections}
    />
  );
}
