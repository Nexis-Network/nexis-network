"use client";

import { useMemo } from "react";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";

type Status = { user: boolean; session: boolean };

/**
 * Derives auth status from the central SupabaseAuthProvider context instead of
 * making a separate `supabase.auth.getUser()` call. Returns a react-query-like
 * shape so all existing consumers remain compatible.
 */
export function useAuthStatus() {
  const { user, session, status } = useSupabaseAuth();

  const data = useMemo<Status>(
    () => ({
      user: Boolean(user),
      session: Boolean(session),
    }),
    [user, session],
  );

  const isPending = status === "loading";
  const isFetching = status === "loading";

  return {
    data,
    isPending,
    isFetching,
    isLoading: isPending,
    isError: false,
    error: null,
  };
}
