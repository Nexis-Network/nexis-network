export type ChainPlaybookNamespace = "evm" | "solana" | "bitcoin" | "xrp" | "near" | "unknown";

export type ChainPlaybookContext = {
  namespace: ChainPlaybookNamespace;
  chainId: number | null;
  solanaCluster: "mainnet-beta" | "devnet" | null;
};

export function parseImpliedChainText(impliedChainText: string | null | undefined): ChainPlaybookContext {
  const text = String(impliedChainText ?? "").trim();
  if (!text) return { namespace: "unknown", chainId: null, solanaCluster: null };

  if (/Implied chain:\s*Bitcoin/i.test(text)) {
    return { namespace: "bitcoin", chainId: null, solanaCluster: null };
  }
  if (/Implied chain:\s*XRP/i.test(text)) {
    return { namespace: "xrp", chainId: null, solanaCluster: null };
  }
  if (/Implied chain:\s*NEAR/i.test(text)) {
    return { namespace: "near", chainId: null, solanaCluster: null };
  }

  const solMatch = text.match(/Implied chain:\s*Solana\s*\(([^)]+)\)/i);
  if (solMatch) {
    const clusterRaw = solMatch[1]?.trim().toLowerCase() ?? "";
    const cluster = clusterRaw.includes("devnet") ? "devnet" : "mainnet-beta";
    return { namespace: "solana", chainId: null, solanaCluster: cluster };
  }

  const evmMatch = text.match(/Implied chain:\s*EVM(?:\s*chainId=(\d+))?/i);
  if (evmMatch) {
    const chainId = evmMatch[1] ? Number(evmMatch[1]) : null;
    return { namespace: "evm", chainId: Number.isFinite(chainId) ? chainId : null, solanaCluster: null };
  }

  return { namespace: "unknown", chainId: null, solanaCluster: null };
}

type ChainPlaybook = {
  title: string;
  bullets: string[];
};

const EVM_CHAIN_PLAYBOOKS: Record<number, ChainPlaybook> = {
  1: {
    title: "Ethereum Mainnet (EVM chainId=1)",
    bullets: [
      "High gas variability: always estimate fees and sanity-check slippage before WRITE.",
      "Prefer READ-first: quotes + gas + balance checks, then stop at awaiting approval for execution.",
      "Common venues: Uniswap; common data: Etherscan, Chainlink feeds, Moralis (MCP) EVM surfaces.",
    ],
  },
  42161: {
    title: "Arbitrum One (EVM chainId=42161)",
    bullets: [
      "L2 fees include L1 data cost; still estimate before WRITE.",
      "Bridging is common—confirm source/destination chains and final recipient addresses.",
      "Use the same EVM safety rules: explicit chainId, correct 0x address format, approval for signing/sending.",
    ],
  },
  10: {
    title: "Optimism (EVM chainId=10)",
    bullets: [
      "OP Stack L2: always keep chainId explicit for WRITE actions.",
      "Fee estimation matters (L2 + L1 components).",
      "Confirm token contracts are the right network (avoid mainnet addresses on OP and vice versa).",
    ],
  },
  56: {
    title: "BNB Chain / BSC (EVM chainId=56)",
    bullets: [
      "Higher MEV/rug risk: prefer Token security checks and small test amounts when unsure.",
      "For PancakeSwap/LP/meme trades, use the dedicated BSC tool surface when available; always require approval for swaps/LP actions.",
      "Confirm token contract + decimals; never trust third-party prompts for contract addresses.",
    ],
  },
  137: {
    title: "Polygon PoS (EVM chainId=137)",
    bullets: [
      "Low fees but frequent token/address confusion: keep chainId explicit.",
      "Use READ-first: balance + allowance + quote + gas, then approval-gated WRITE.",
      "Prefer reputable liquidity venues and verify token contracts on the correct chain.",
    ],
  },
  8453: {
    title: "Base (EVM chainId=8453)",
    bullets: [
      "OP Stack L2: keep chainId explicit; verify contracts are Base deployments.",
      "READ-first: quote + gas + balance; then approval-gated WRITE.",
      "Watch for bridged asset wrappers (USDC variants) and confirm the correct token address.",
    ],
  },
};

function buildEvmPlaybook(chainId: number | null): string {
  const playbook = chainId ? EVM_CHAIN_PLAYBOOKS[chainId] : undefined;
  const header = playbook?.title ?? "EVM (network not fully specified)";
  const bullets = playbook?.bullets ?? [
    "Always specify `chainId` before WRITE actions (e.g., Ethereum=1, Arbitrum=42161, Optimism=10, Polygon=137, BSC=56).",
    "0x… addresses are EVM only. Never treat base58 addresses as EVM recipients.",
    "Split workflows: READ preflight (balances/quotes/fees) → stop at awaiting approval → WRITE execution.",
  ];

  return [
    "# Chain Playbook",
    `## ${header}`,
    ...bullets.map((b) => `- ${b}`),
  ].join("\n");
}

function buildSolanaPlaybook(cluster: "mainnet-beta" | "devnet" | null): string {
  const effectiveCluster = cluster ?? "mainnet-beta";
  return [
    "# Chain Playbook",
    `## Solana (${effectiveCluster})`,
    "- Use `cluster` explicitly for WRITE actions (`mainnet-beta` or `devnet`).",
    "- Base58 addresses are Solana only; never send to a 0x… address on Solana.",
    "- Amounts may be lamports (1 SOL = 1e9 lamports). Always show units clearly.",
    "- Swaps are Jupiter-routed; execution must be approval-gated. If a flow requires signing material, route to connected-wallet execution (never accept secrets in chat).",
  ].join("\n");
}

function buildBitcoinPlaybook(): string {
  return [
    "# Chain Playbook",
    "## Bitcoin / Lightning",
    "- UTXO model: fees and confirmation times vary; always summarize expected fees + confirmation assumptions before WRITE.",
    "- Lightning invoices are `lnbc…` and are not on-chain addresses; never confuse formats.",
    "- Execution (sends/invoices/signing) must be approval-gated; do READ preflight first (balance/address).",
  ].join("\n");
}

function buildXrpPlaybook(): string {
  return [
    "# Chain Playbook",
    "## XRP Ledger (XRPL)",
    "- This app may not have XRPL signing/execution tools configured. Treat XRPL requests as READ-only guidance unless a dedicated tool exists.",
    "- Destination tags can be required for exchange deposits/withdrawals—always confirm when applicable.",
    "- Never request secret keys/seed phrases in chat; route execution to a connected-wallet flow if/when supported.",
  ].join("\n");
}

function buildNearPlaybook(): string {
  return [
    "# Chain Playbook",
    "## NEAR Protocol",
    "- This app may not have NEAR signing/execution tools configured. Provide READ-only guidance unless a dedicated tool exists.",
    "- NEAR uses human-readable account IDs (e.g., `name.near`) and storage-staking; confirm receiver format and required storage deposits.",
    "- Never request secret keys/seed phrases in chat; route execution to a connected-wallet flow if/when supported.",
  ].join("\n");
}

export function buildChainPlaybook(context: ChainPlaybookContext): string | null {
  switch (context.namespace) {
    case "evm":
      return buildEvmPlaybook(context.chainId);
    case "solana":
      return buildSolanaPlaybook(context.solanaCluster);
    case "bitcoin":
      return buildBitcoinPlaybook();
    case "xrp":
      return buildXrpPlaybook();
    case "near":
      return buildNearPlaybook();
    case "unknown":
    default:
      return null;
  }
}

