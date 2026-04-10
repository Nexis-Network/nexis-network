"use client";

/**
 * Wallet Authentication Hook
 *
 * Domain: Authentication
 * Responsibility: Handles EVM + Solana wallet login flows (including WalletConnect)
 * Depends on: LoginControllerCore, sonner for toasts
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import bs58 from "bs58";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";

import type { LoginControllerCore } from "@/lib/auth/login-controller-core";
import { useTranslations } from "@/components/providers/locale-provider";
import { storeAuthIdentifier } from "@/lib/auth-profile";
import { getSupportedChainIds } from "@/lib/chains";
import type { Mode, Step, WalletAuthMethod } from "@/components/auth/login/types";


import { logger } from '@/lib/logger';
type WalletChallengePayload = {
  nonce: string;
  message: string;
  chain_id?: number | null;
  chain_namespace?: string | null;
};

type WalletVerifyPayload = {
  access_token?: string | null;
  refresh_token?: string | null;
  session?: {
    access_token?: string | null;
    refresh_token?: string | null;
  } | null;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: UntypedJson[] }) => Promise<UntypedJson>;
};

export interface WalletAuthState {
  walletLoading: boolean;
  walletError: string | null;
  walletConnectEnabled: boolean;
}

export interface UseWalletAuthOptions {
  loginCore: LoginControllerCore;
  mode: Mode;
  inviteCode: string | null;
  onStepChange: (step: Step) => void;
  onSuccess: () => void;
  hasAcceptedPolicies: boolean;
}

export interface UseWalletAuthReturn extends WalletAuthState {
  handleWalletAuth: (method: WalletAuthMethod) => Promise<void>;
  resetWalletState: () => void;
}

function resolveWalletConnectMetadata() {
  const fallbackOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "https://nex-t1.ai";
  const name =
    typeof document !== "undefined" && document.title.trim().length > 0
      ? document.title.trim()
      : "Nex-T1";
  const url = fallbackOrigin;
  const iconUrl = new URL("/logo/nexis-app-logo.svg", fallbackOrigin).toString();
  return {
    name,
    description: "Nex-T1 wallet login",
    url,
    icons: [iconUrl],
  };
}

async function requestWalletChallenge(params: {
  chain: "evm" | "solana";
  address: string;
  chainId?: number | null;
  chainNamespace?: string | null;
}): Promise<WalletChallengePayload> {
  const response = await fetch("/api/auth/wallet/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      chain: params.chain,
      address: params.address,
      chain_id: params.chainId ?? undefined,
      chain_namespace: params.chainNamespace ?? undefined,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "Failed to request wallet challenge.";
    throw new Error(message);
  }
  return payload as WalletChallengePayload;
}

async function verifyWalletLogin(params: {
  chain: "evm" | "solana";
  address: string;
  nonce: string;
  signature: string;
  signatureEncoding?: string;
}): Promise<WalletVerifyPayload> {
  const response = await fetch("/api/auth/wallet/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      chain: params.chain,
      address: params.address,
      nonce: params.nonce,
      signature: params.signature,
      signature_encoding: params.signatureEncoding,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "Wallet verification failed.";
    throw new Error(message);
  }
  return payload as WalletVerifyPayload;
}

function resolveWalletTokens(payload: WalletVerifyPayload) {
  const session = payload.session ?? null;
  const accessToken =
    (typeof payload.access_token === "string" && payload.access_token) ||
    (typeof session?.access_token === "string" ? session.access_token : null);
  const refreshToken =
    (typeof payload.refresh_token === "string" && payload.refresh_token) ||
    (typeof session?.refresh_token === "string" ? session.refresh_token : null);
  return { accessToken, refreshToken };
}

async function requestEvmSignature(provider: Eip1193Provider, message: string, address: string): Promise<string> {
  try {
    const signature = await provider.request({
      method: "personal_sign",
      params: [message, address],
    });
    if (typeof signature === "string") {
      return signature;
    }
  } catch {
    // fallback to reversed params order for some providers
  }

  const signature = await provider.request({
    method: "personal_sign",
    params: [address, message],
  });
  if (typeof signature !== "string") {
    throw new Error("Wallet did not return a valid signature.");
  }
  return signature;
}

export function useWalletAuth({
  loginCore,
  mode,
  inviteCode,
  onStepChange,
  onSuccess,
  hasAcceptedPolicies,
}: UseWalletAuthOptions): UseWalletAuthReturn {
  const t = useTranslations("auth");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const solanaWallet = useSolanaWallet();
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  const walletConnectEnabled = walletConnectProjectId.length > 0;
  
  // Dev warning for missing config
  if (process.env.NODE_ENV === "development" && !walletConnectEnabled) {
      logger.warn("[WalletAuth] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing. WalletConnect will be disabled.");
  }

  const walletConnectRef = useRef<InstanceType<typeof EthereumProvider> | null>(null);

  const supportedChainIds = useMemo(() => getSupportedChainIds(), []);

  const resetWalletState = useCallback(() => {
    setWalletError(null);
  }, []);

  const resolveWalletConnectProvider = useCallback(async (): Promise<Eip1193Provider> => {
    if (!walletConnectEnabled) {
      throw new Error("WalletConnect is not configured.");
    }
    if (walletConnectRef.current) {
      return walletConnectRef.current;
    }
    const [primaryChainId = 1, ...optionalChains] = supportedChainIds;
    const provider = await EthereumProvider.init({
      projectId: walletConnectProjectId,
      metadata: resolveWalletConnectMetadata(),
      chains: [primaryChainId],
      optionalChains,
      showQrModal: true,
    });
    walletConnectRef.current = provider;
    return provider;
  }, [supportedChainIds, walletConnectEnabled, walletConnectProjectId]);

  const applyWalletSession = useCallback(
    async (payload: WalletVerifyPayload) => {
      await loginCore.applySessionFromPayload(payload.session ?? payload);
      const { accessToken } = resolveWalletTokens(payload);
      await loginCore.refreshSession({ supabaseAccessToken: accessToken ?? null });
      if (inviteCode) {
        await loginCore.applyInviteMetadata();
      }
    },
    [inviteCode, loginCore],
  );

  const signInWithEvm = useCallback(
    async (provider: Eip1193Provider) => {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) ? (accounts[0] as string | undefined) : undefined;
      if (!address) {
        throw new Error("No wallet address returned.");
      }
      const chainIdRaw = await provider.request({ method: "eth_chainId" });
      const chainId =
        typeof chainIdRaw === "string"
          ? Number.parseInt(chainIdRaw, 16)
          : typeof chainIdRaw === "number"
            ? chainIdRaw
            : null;

      const challenge = await requestWalletChallenge({
        chain: "evm",
        address,
        chainId: Number.isFinite(chainId ?? NaN) ? chainId : null,
      });
      const signature = await requestEvmSignature(provider, challenge.message, address);
      const payload = await verifyWalletLogin({
        chain: "evm",
        address,
        nonce: challenge.nonce,
        signature,
      });

      await applyWalletSession(payload);
      storeAuthIdentifier(address, "wallet");
    },
    [applyWalletSession],
  );

  const signInWithSolana = useCallback(async () => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!solanaWallet.wallet) {
          throw new Error("No Solana wallet detected.");
        }
        if (!solanaWallet.connected) {
          await solanaWallet.connect();
        }
        const publicKey = solanaWallet.publicKey?.toBase58();
        if (!publicKey) {
          throw new Error("No Solana wallet address available.");
        }
        if (!solanaWallet.signMessage) {
          throw new Error("This Solana wallet does not support message signing.");
        }

        const challenge = await requestWalletChallenge({
          chain: "solana",
          address: publicKey,
          chainNamespace: "solana",
        });

        const signatureBytes = await solanaWallet.signMessage(new TextEncoder().encode(challenge.message));
        const signature = bs58.encode(signatureBytes);

        const payload = await verifyWalletLogin({
          chain: "solana",
          address: publicKey,
          nonce: challenge.nonce,
          signature,
          signatureEncoding: "base58",
        });

        await applyWalletSession(payload);
        storeAuthIdentifier(publicKey, "wallet");
        return; // Success, exit retry loop
      } catch (error) {
        if (attempt === MAX_RETRIES) throw error;

        const message = error instanceof Error ? error.message : "";
        // Phantom service worker issue - wait and retry with exponential backoff
        if (message.includes("disconnected port") || message.includes("service worker")) {
          // If all retries failed, log warning but do not crash the app flow
          if (attempt === MAX_RETRIES) {
            logger.warn("[Phantom] Service worker disconnected. User may need to reload.");
            throw new Error("Phantom wallet disconnected. Please reload the page.");
          }
           await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
           continue;
        }
        throw error; // Non-retryable error
      }
    }
  }, [applyWalletSession, solanaWallet]);

  const handleWalletAuth = useCallback(
    async (method: WalletAuthMethod) => {
      if (walletLoading) return;
      resetWalletState();

      if (mode === "sign-up" && !hasAcceptedPolicies) {
        toast.error(t("toasts.acceptLegal"));
        return;
      }

      try {
        setWalletLoading(true);
        if (method === "wallet-solana") {
          await signInWithSolana();
        } else {
          const provider =
            method === "walletconnect"
              ? await resolveWalletConnectProvider()
              : ((window as UntypedJson as { ethereum?: Eip1193Provider }).ethereum ?? null);
          if (!provider) {
            throw new Error("No EVM wallet detected. Install a wallet extension or use WalletConnect.");
          }
          await signInWithEvm(provider);
        }
        toast.success(t("toasts.walletVerified"));
        onSuccess();
      } catch (error) {
        const message = error instanceof Error ? error.message : t("toasts.walletAuthFailed");
        setWalletError(message);
        toast.error(message);
        onStepChange("wallet");
      } finally {
        setWalletLoading(false);
      }
    },
    [
      hasAcceptedPolicies,
      mode,
      onStepChange,
      onSuccess,
      resetWalletState,
      resolveWalletConnectProvider,
      signInWithEvm,
      signInWithSolana,
      t,
      walletLoading,
    ],
  );

  return {
    walletLoading,
    walletError,
    walletConnectEnabled,
    handleWalletAuth,
    resetWalletState,
  };
}
