"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/api-platform";
import type { CommandInventory } from "@/components/chat-composer/command-inventory";

async function fetchCommandInventory(): Promise<CommandInventory> {
  const response = await fetch("/api/chat/command-inventory", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as ApiResponse<CommandInventory>;

  if (!response.ok || payload.success !== true || !payload.data) {
    throw new Error(payload.error?.message ?? "Failed to load command inventory");
  }

  return payload.data;
}

type UseCommandInventoryOptions = {
  enabled?: boolean;
};

export function useCommandInventory({
  enabled = true,
}: UseCommandInventoryOptions = {}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return useQuery({
    queryKey: ["chat-command-inventory"],
    queryFn: fetchCommandInventory,
    staleTime: 60_000,
    enabled: isMounted && enabled,
  });
}
