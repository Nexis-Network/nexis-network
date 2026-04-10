"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";

import type { LoginControllerCore } from "@/lib/auth/login-controller-core";
import { logger } from "@/lib/logger";

import { navigateTo, stripOAuthSearchParams } from "./login-controller-navigation";
import { resolvePostAuthTarget } from "./login-controller-utils";

type UseLoginControllerSessionOptions = {
  loginCore: LoginControllerCore;
  supabaseClient: SupabaseClient | null;
  queryClient: QueryClient;
  isAuthenticated: boolean;
  redirectTo?: string;
  onSuccess?: () => void;
};

function invalidateAuthQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ["auth-status"] });
  queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
  queryClient.invalidateQueries({ queryKey: ["smart-wallets"] });
}

export function useLoginControllerSession({
  isAuthenticated,
  loginCore,
  onSuccess,
  queryClient,
  redirectTo,
  supabaseClient,
}: UseLoginControllerSessionOptions) {
  const router = useRouter();
  const [sessionSynced, setSessionSynced] = useState(false);
  const bootstrapAttemptedRef = useRef(false);
  const navigationCommittedRef = useRef(false);

  const handleSessionError = useCallback(
    async (error: UntypedJson) => loginCore.handleSessionError(error),
    [loginCore],
  );

  const handlePostAuth = useCallback(() => {
    if (navigationCommittedRef.current) {
      return;
    }

    navigationCommittedRef.current = true;
    onSuccess?.();
    navigateTo(router, resolvePostAuthTarget(redirectTo));
  }, [onSuccess, redirectTo, router]);

  useEffect(() => {
    if (bootstrapAttemptedRef.current || !supabaseClient) {
      return;
    }

    let active = true;
    bootstrapAttemptedRef.current = true;

    void (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) {
          await loginCore.refreshSession();
        }
      } catch (error) {
        const handled = await handleSessionError(error);
        if (!handled) {
          logger.warn("supabase_session_prefetch_failed", error);
        }
      } finally {
        if (active) {
          setSessionSynced(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [handleSessionError, loginCore, supabaseClient]);

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }

    const { data } = supabaseClient.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        void (async () => {
          try {
            if (event === "SIGNED_IN" && session) {
              bootstrapAttemptedRef.current = false;
              await loginCore.refreshSession();
            }

            if (event === "SIGNED_OUT") {
              invalidateAuthQueries(queryClient);
            }
          } catch (error) {
            const handled = await handleSessionError(error);
            if (!handled) {
              logger.warn("supabase_auth_state_change_failed", { error, event });
            }
          }
        })();
      },
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, [handleSessionError, loginCore, queryClient, supabaseClient]);

  useEffect(() => {
    if (!isAuthenticated || !sessionSynced || navigationCommittedRef.current) {
      return;
    }

    navigationCommittedRef.current = true;
    onSuccess?.();
    const target = resolvePostAuthTarget(redirectTo);
    stripOAuthSearchParams(router, target);
    navigateTo(router, target);
  }, [isAuthenticated, onSuccess, redirectTo, router, sessionSynced]);

  return { handlePostAuth } as const;
}
