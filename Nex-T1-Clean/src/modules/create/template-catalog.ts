import { cacheLife, cacheTag } from "next/cache";

import type { CreateCapability, CreateTemplate, CreateTemplateId } from "./types";

const TEMPLATE_CATALOG = [
  {
    id: "wagmi-evm",
    label: "Wagmi EVM",
    description: "Modern EVM dApps with Wagmi, Viem, wallet connectors, and typed hooks.",
    chainFamily: "evm",
    framework: "wagmi",
    starterPrompts: [
      "Build a Base mainnet token-gated dashboard with wallet connect and Supabase auth.",
      "Create a swap-ready DeFi landing app with Wagmi, RainbowKit-style wallet UX, and Stripe-powered premium access.",
      "Generate a cross-chain portfolio tracker for EVM wallets with Supabase-backed watchlists.",
    ],
  },
  {
    id: "web3js-evm",
    label: "Web3.js EVM",
    description: "Low-level EVM integrations with Web3.js for custom contract reads, writes, and events.",
    chainFamily: "evm",
    framework: "web3js",
    starterPrompts: [
      "Create an NFT mint dashboard using Web3.js, contract event history, and Supabase user profiles.",
      "Build an onchain loyalty app with Web3.js, Stripe subscriptions, and protected admin analytics.",
      "Generate a DAO proposal explorer with wallet voting and Supabase-managed roles.",
    ],
  },
  {
    id: "solana-web3js",
    label: "Solana Web3.js",
    description: "Solana dApps with wallet adapter flows, RPC actions, and program account reads.",
    chainFamily: "solana",
    framework: "solana-web3js",
    starterPrompts: [
      "Build a Solana token launch dashboard with wallet adapter, Supabase auth, and premium creator tools.",
      "Create a Solana staking portal with account stats, claim actions, and Stripe-powered pro plans.",
      "Generate a compressed-NFT gallery with Supabase collections and wallet-based saved views.",
    ],
  },
] as const satisfies readonly CreateTemplate[];

const CAPABILITIES = [
  {
    id: "supabase-auth",
    label: "Supabase Auth",
    description: "Generated apps are guided to use Supabase authentication and server-side session patterns.",
  },
  {
    id: "supabase-db",
    label: "Supabase Data",
    description: "Prompts bias toward Supabase-backed persistence, policies, and typed data access.",
  },
  {
    id: "stripe",
    label: "Stripe Billing",
    description: "Premium flows, gated features, and customer upgrade surfaces are included in the generation context.",
  },
  {
    id: "preview",
    label: "Live Preview",
    description: "Every project mirrors the latest v0 preview URL and file snapshot for resume and review.",
  },
] as const satisfies readonly CreateCapability[];

export async function getCreateTemplateCatalog(): Promise<readonly CreateTemplate[]> {
  "use cache";

  cacheLife("days");
  cacheTag("create-template-catalog");

  return TEMPLATE_CATALOG;
}

export async function getCreateCapabilities(): Promise<readonly CreateCapability[]> {
  "use cache";

  cacheLife("days");
  cacheTag("create-capabilities");

  return CAPABILITIES;
}

export function getCreateTemplate(templateId: CreateTemplateId): CreateTemplate {
  const template = TEMPLATE_CATALOG.find((entry) => entry.id === templateId);
  if (!template) {
    throw new Error(`Unsupported create template: ${templateId}`);
  }
  return template;
}
