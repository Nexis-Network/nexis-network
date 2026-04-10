"use client";

import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTranslations } from "@/components/providers/locale-provider";
import { createLoginState, loginReducer } from "@/lib/auth/machines/login-machine";
import { LoginControllerCore } from "@/lib/auth/login-controller-core";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useAuthProviders } from "@/hooks/auth/use-auth-providers";
import { useAuthStatus } from "@/hooks/user/use-auth-status";

import type { AuthMethod, LoginProps, Mode, Step } from "@/components/auth/login/types";
import { normalizeIdentifierValue, normalizeInviteCode } from "./login-controller-utils";
import { useLoginControllerAuthFlows } from "./use-login-controller-auth-flows";
import { useLoginControllerSession } from "./use-login-controller-session";
import { useLoginControllerViewModel } from "./use-login-controller-view-model";

export type LoginController = ReturnType<typeof useLoginController>;

export function useLoginController({
  redirectTo,
  onSuccess,
  initialMode = "sign-in",
  inviteCode = null,
}: LoginProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("auth");
  const [machineState, dispatchMachine] = useReducer(
    loginReducer,
    initialMode,
    (modeInit: Mode) => createLoginState(modeInit),
  );
  const { mode, step, authMethod } = machineState;
  const [identifier, setIdentifier] = useState("");
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const { data: authStatus, isPending, isFetching } = useAuthStatus();
  const { data: providerMap, isFetched: providersResolved } = useAuthProviders();
  const supabaseClient = useMemo(() => getSupabaseBrowserClient(), []);
  const normalizedInviteCode = useMemo(() => normalizeInviteCode(inviteCode), [inviteCode]);
  const normalizedIdentifierValue = useMemo(
    () => normalizeIdentifierValue(authMethod, identifier),
    [authMethod, identifier],
  );
  const setStep = useCallback(
    (nextStep: Step) => dispatchMachine({ type: "SET_STEP", step: nextStep }),
    [],
  );
  const setMode = useCallback(
    (nextMode: Mode) => dispatchMachine({ type: "SET_MODE", mode: nextMode }),
    [],
  );
  const setAuthMethod = useCallback(
    (method: AuthMethod) => dispatchMachine({ type: "SET_AUTH_METHOD", method }),
    [],
  );
  const loginCore = useMemo(
    () =>
      new LoginControllerCore({
        supabaseClient,
        queryClient,
        normalizedInviteCode,
      }),
    [normalizedInviteCode, queryClient, supabaseClient],
  );
  const captchaTokenRef = useRef<string | null>(null);

  const { handlePostAuth } = useLoginControllerSession({
    loginCore,
    supabaseClient,
    queryClient,
    isAuthenticated: Boolean(authStatus?.user && authStatus?.session),
    redirectTo,
    onSuccess,
  });

  const {
    otpAuth,
    credentialAuth,
    oauthAuth,
    magicLinkAuth,
    walletAuth,
    stateActions,
    submitActions,
  } = useLoginControllerAuthFlows({
    authMethod,
    mode,
    step,
    identifier,
    normalizedIdentifierValue,
    normalizedInviteCode,
    hasAcceptedPolicies,
    redirectTo,
    loginCore,
    setMode,
    setStep,
    setAuthMethod,
    setIdentifier,
    handlePostAuth,
    captchaToken: captchaTokenRef.current,
    t,
  });

  return useLoginControllerViewModel({
    supabaseClient,
    isCheckingAuth: isPending || isFetching,
    isAuthenticated: Boolean(authStatus?.user && authStatus?.session),
    step,
    mode,
    authMethod,
    identifier,
    hasAcceptedPolicies,
    normalizedIdentifierValue,
    providerMap,
    providersResolved,
    t,
    magicLinkAuth,
    credentialAuth,
    oauthAuth,
    otpAuth,
    walletAuth,
    stateActions,
    submitActions,
    setIdentifier,
    setHasAcceptedPolicies,
  });
}
