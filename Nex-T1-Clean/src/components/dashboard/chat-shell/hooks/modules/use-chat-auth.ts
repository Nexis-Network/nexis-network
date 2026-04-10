"use client";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { useAuthStatus } from "@/hooks/user/use-auth-status";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function useChatAuth() {
  const router = useRouter();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  
  const { isAuthenticated } = useAuthContext();
  const {
    data: authStatus,
    isPending: authPending,
    isFetching: authFetching,
  } = useAuthStatus();

  const isSupabaseAuthenticated = Boolean(authStatus?.user && authStatus?.session);
  const isLoggedIn = isAuthenticated || isSupabaseAuthenticated;
  const isAuthChecking = authPending || authFetching;

  const handleAuthNavigation = useCallback(
    (view: "sign-in" | "sign-up") => {
      setAuthDialogOpen(false);
      router.push(`/${view}`);
    },
    [router]
  );

  return {
    authDialogOpen,
    setAuthDialogOpen,
    isAuthenticated,
    isLoggedIn,
    isAuthChecking,
    handleAuthNavigation,
  };
}
