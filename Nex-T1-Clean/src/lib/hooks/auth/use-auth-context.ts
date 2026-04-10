"use client";

import { useMemo } from "react";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";

export function useAuthContext() {
  const auth = useSupabaseAuth();

  return useMemo(
    () => ({
      ...auth,
      isAuthenticated: auth.status === "authenticated",
    }),
    [auth],
  );
}

