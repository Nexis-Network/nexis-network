"use client";

import { useActiveAccountContext } from "@/components/providers/active-account-provider";

export function useActiveAccount() {
  return useActiveAccountContext();
}

