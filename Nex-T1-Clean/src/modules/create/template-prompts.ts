import type { CreateTemplate } from "./types";

function getChainGuidance(template: CreateTemplate): string {
  if (template.chainFamily === "solana") {
    return "Target Solana mainnet/devnet using @solana/web3.js and wallet adapter patterns.";
  }

  if (template.framework === "wagmi") {
    return "Target EVM chains with wagmi, viem, and modern wallet connector flows.";
  }

  return "Target EVM chains with Web3.js and explicit provider / signer orchestration.";
}

export function buildCreateSystemPrompt(template: CreateTemplate): string {
  return [
    "You are generating a production-grade web dApp starter.",
    "Use Next.js App Router with TypeScript and a responsive, polished UI.",
    getChainGuidance(template),
    "Always integrate Supabase Authentication and Supabase cloud database access patterns.",
    "Always account for Stripe subscription or premium-gating flows in the generated app architecture.",
    "Prefer environment variables and secure server-side access for secrets.",
    "Include a preview-friendly landing experience plus the requested core dApp workflow.",
    "Keep the project deployable and readable, with clear file boundaries and no placeholder lorem ipsum.",
  ].join(" ");
}
