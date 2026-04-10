"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSupabaseAuth, useSupabaseStatus } from "@/components/providers/supabase-auth-provider";

const isTestMode = () => {
  // SECURITY: Test mode bypasses are only available in non-production builds.
  // In production, window.__TEST_MODE cannot be used to bypass authentication.
  if (process.env.NODE_ENV === "production") return false;
  return (
    (typeof window !== "undefined" &&
      (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true) ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
    process.env.E2E_TEST_MODE === "true"
  );
};

type GuardProps = {
  children: ReactNode;
};

export function SignedIn({ children }: GuardProps) {
  const { status } = useSupabaseStatus();
  if (status !== "authenticated" && !isTestMode()) {
    return null;
  }
  return <>{children}</>;
}

export function SignedOut({ children }: GuardProps) {
  const { status } = useSupabaseStatus();
  if (status === "authenticated" || isTestMode()) {
    return null;
  }
  return <>{children}</>;
}

type RedirectProps = {
  to?: string;
  replace?: boolean;
};

export function RedirectToSignIn({ to, replace = true }: RedirectProps) {
  const router = useRouter();
  const { status } = useSupabaseStatus();

  useEffect(() => {
    if (status === "authenticated" || isTestMode()) {
      return;
    }

    const target = to ?? "/auth";
    if (replace) {
      router.replace(target);
    } else {
      router.push(target);
    }
  }, [router, status, to, replace]);

  return null;
}

export function useAuthenticate() {
  const { session, user, status } = useSupabaseAuth();

  return {
    session,
    user,
    isPending: status === "loading",
    status,
    error: status === "unconfigured" ? new Error("Supabase is not configured") : null,
  } as const;
}
