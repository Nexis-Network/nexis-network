"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { McpService } from "@/lib/mcp/mcp-service";
import { logger } from "@/lib/logger";

export function useMcpServerCount() {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCount = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Check auth state first to avoid unnecessary errors
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setActiveCount(0);
        return;
      }

      const configs = await McpService.getUserConfigs(supabase);
      const normalizedConfigs = Array.isArray(configs) ? configs : [];
      if (!Array.isArray(configs)) {
        logger.warn("MCP config response was not an array; defaulting to empty list");
      }

      // Filter for enabled configs
      const enabledCount = normalizedConfigs.filter((config) => config.enabled).length;
      setActiveCount(enabledCount);
      setError(null);
    } catch (err) {
      logger.error("Failed to fetch MCP server count", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCount();
  }, []);

  return { 
    activeCount, 
    loading, 
    error,
    refresh: fetchCount 
  };
}
