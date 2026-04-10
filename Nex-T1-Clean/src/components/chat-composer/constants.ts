import {
  IconArrowsExchange,
  IconArrowsLeftRight,
  IconCurrencyDollar,
  IconCurrencyEthereum,
  IconRocket,
  IconShoppingCart,
  IconWallet,
} from "@tabler/icons-react";
import { CHAT_MODELS } from "@/components/dashboard/chat-config";
import { SYSTEM_PROMPT_PROFILES } from "@/modules/chat/system-prompt-profiles";

export const PROMPTS = [
  {
    id: "send-eth",
    icon: IconCurrencyEthereum,
    text: "Send 0.1 ETH",
    prompt:
      [
        "# MODE: WRITE (Transaction) — approval required",
        "",
        "## Goal",
        "Send **0.1 ETH** from the active Nex agent wallet to the recipient I provide.",
        "",
        "## Preflight (READ)",
        "- Call `agent_wallet_list` if you need the sender address.",
        "",
        "## Execute (WRITE) — STOP at awaiting approval",
        "- Wait for my explicit confirmation before broadcasting.",
        "- Then call `evm_wallet_send_asset` with the sender address, recipient, amount, and chain (HITL).",
        "",
        "## Guardrails",
        "- Do not sign or send without approval.",
        "- Confirm chain/network (`chainId`) if not explicit.",
      ].join("\n"),
  },
  {
    id: "evm-wallet",
    icon: IconWallet,
    text: "Create new EVM wallet",
    prompt:
      [
        "# MODE: WRITE (Setup) — no funds moved",
        "",
        "## Goal",
        "Provision a fresh **agent EVM wallet** for later use.",
        "",
        "## Execute (WRITE: setup)",
        '- Call `cryptowallet_evm` with `command: wallet_create_random` and providerURL `https://base.drpc.org`.',
        "",
        "## Output",
        "- Return the **new address only** (never reveal private keys/mnemonics/seed phrases).",
        "- Confirm it is stored under Settings → Wallets for audit logging and export.",
      ].join("\n"),
  },
  {
    id: "sol-wallet",
    icon: IconCurrencyDollar,
    text: "Create new Solana wallet",
    prompt:
      [
        "# MODE: WRITE (Setup) — Solana wallet provisioning",
        "",
        "## Goal",
        "Create a new **Solana wallet** for the agent (no seed phrases in chat).",
        "",
        "## Rules",
        "- If direct Solana wallet creation isn't available via tools, explain the safest Settings → Wallets flow.",
        "- Do **not** request or display seed phrases/private keys in chat.",
        "- If funding is needed, provide a **READ-only** funding plan and wait for explicit approval before any transfer.",
      ].join("\n"),
  },
  {
    id: "pumpfun",
    icon: IconRocket,
    text: "Deploy token on Pump.fun",
    prompt:
      [
        "# MODE: WRITE (Token launch / transaction) — approval required",
        "",
        "## Goal",
        "Launch a Pump.fun token named **Nex Momentum** (symbol **NEXM**) on **devnet** with **0.35 SOL** seed capital.",
        "",
        "## Preflight (READ)",
        "- Confirm cluster = devnet and the creator wallet address (no secrets).",
        "- Summarize slippage (≤1%) + priority fee guidance.",
        "",
        "## Execute (WRITE) — STOP at awaiting approval",
        "- Attempt `pumpfun_trader` `create_and_buy` with the above constraints.",
        "- If chat trading is blocked (requires signing material), return the safest connected-wallet execution path instead.",
        "",
        "## Output",
        "- Report mint, curve snapshot, and renounce steps (as applicable).",
      ].join("\n"),
  },
  {
    id: "buy-eth-uniswap",
    icon: IconShoppingCart,
    text: "Buy ETH on Uniswap",
    prompt:
      [
        "# MODE: READ → WRITE (split) — preview first",
        "",
        "## Goal",
        "Get a USDC→ETH swap quote on the chain I specify, then (optionally) execute after approval.",
        "",
        "## Quote (READ)",
        "- Use the Uniswap MCP (read-only in chat) to fetch the best route + expected output.",
        "- Fetch gas via `blocknative_gas` and estimate total cost + slippage.",
        "",
        "## Execute (WRITE) — STOP at awaiting approval",
        "- Provide a transaction preview and wait for my confirmation before any value-moving execution.",
      ].join("\n"),
  },
  {
    id: "buy-eth-base",
    icon: IconArrowsLeftRight,
    text: "Buy 0.01 ETH on Base",
    prompt:
      [
        "# MODE: READ → WRITE (split) — Base swap preview",
        "",
        "## Chain",
        "- Base (EVM) — specify `chainId=8453` if needed.",
        "",
        "## Quote (READ)",
        "- Quote a USDC→ETH swap for ~0.01 ETH worth using the Uniswap MCP (read-only in chat).",
        "- Enforce ≤0.5% slippage and include priority fee guidance.",
        "- Show cost basis before sending.",
        "",
        "## Execute (WRITE) — STOP at awaiting approval",
        "- Do not execute any value-moving tool without explicit approval.",
      ].join("\n"),
  },
  {
    id: "bridge-usdc",
    icon: IconArrowsExchange,
    text: "Bridge 50 USDC Base→Sol",
    prompt:
      [
        "# MODE: READ → WRITE (split) — cross-chain bridge",
        "",
        "## Goal",
        "Bridge **50 USDC** from **Base → Solana**.",
        "",
        "## Plan (READ)",
        "- If direct bridge tooling isn't available, outline the safest manual path (Wormhole/DeBridge).",
        "- List what to verify: balances, addresses, fees, ETA, and common failure modes.",
        "",
        "## Execute (WRITE) — STOP at awaiting approval",
        "- If tooling is available, generate a preview and wait for explicit approval before execution.",
      ].join("\n"),
  },
] as const;

export type PromptShortcutId = (typeof PROMPTS)[number]["id"];

export const MODELS = CHAT_MODELS;

export const PROMPT_PROFILES = SYSTEM_PROMPT_PROFILES;

export const APP_CHAT_COMPOSER_PLACEHOLDER_PROMPTS = [
  "Command your capital",
  "Swap on Uniswap",
  "Snipe tokens on pump.fun",
  "Execute perps transactions",
  "Place predictions on Polymarket",
  "Balance your portfolio",
  "Stake USDC and earn rewards",
] as const;

export const APP_CHAT_COMPOSER_SUGGESTIONS = [
  {
    id: "analyze-crypto-screener",
    label: "Analyze Crypto screener",
    prompt:
      "Analyze the crypto screener using trending + momentum + liquidity as the default lens. Return a compact shortlist with signals, liquidity, and key risks.",
  },
  {
    id: "deploy-pepe-memecoin",
    label: "Create and deploy PEPE memecoin on Base or Solana",
    prompt: "Create and deploy PEPE memecoin on Base or Solana",
  },
  {
    id: "polymarket-predictions",
    label: "Find and make predictions on Polymarket",
    prompt: "Find and make predictions on Polymarket",
  },
] as const;

export type AppChatComposerSuggestion =
  (typeof APP_CHAT_COMPOSER_SUGGESTIONS)[number];
