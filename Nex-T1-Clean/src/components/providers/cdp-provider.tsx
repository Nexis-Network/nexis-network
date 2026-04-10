"use client";

import { type ReactNode } from "react";
import { CDPReactProvider, type CDPReactProviderProps } from "@coinbase/cdp-react";
import { getCdpJwt } from "@/lib/cdp/get-cdp-jwt";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";

/**
 * Nex Wallets Provider
 *
 * Wraps children with CDPReactProvider configured for custom JWT auth.
 * Must wrap WagmiProvider in the component tree so CDP can inject
 * its wagmi connector for EVM Smart Account transactions.
 *
 * Configuration:
 * - customAuth.getJwt: Fetches RS256 JWT from our bridge endpoint
 * - ethereum.createOnLogin: "smart" → Smart Account (ERC-4337) for gas sponsorship
 * - ethereum.enableSpendPermissions: true → AI agent spend limits
 * - solana.createOnLogin: true → Standard Solana account (no smart accounts on Solana)
 */

const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? "";
const CDP_MOCK_PROJECT_ID = "cdp-disabled-mock";

const liveCdpConfig: CDPReactProviderProps["config"] = {
  projectId: CDP_PROJECT_ID,
  customAuth: {
    getJwt: getCdpJwt,
  },
  ethereum: {
    createOnLogin: "smart",
    enableSpendPermissions: true,
  },
  solana: {
    createOnLogin: true,
  },
};

const mockCdpConfig: CDPReactProviderProps["config"] = {
  projectId: CDP_MOCK_PROJECT_ID,
  useMock: true,
  disableAnalytics: true,
};

export function CdpProvider({ children }: { children: ReactNode }) {
  return (
    <CDPReactProvider config={CDP_EMBEDDED_ENABLED ? liveCdpConfig : mockCdpConfig}>
      {children}
    </CDPReactProvider>
  );
}
