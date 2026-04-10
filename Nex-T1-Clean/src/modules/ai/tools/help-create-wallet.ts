
import { createTool, createToolSchema, stringProp } from "./create-tool";

const helpCreateWalletSchema = createToolSchema(
  {
    // No arguments needed effectively, but we can accept an optional query for logging context
    query: stringProp("The user's original query (optional)"),
  },
  [] // No required args
);

export const helpCreateWalletTool = createTool({
  description:
    "Use this tool effectively when the user asks to create a new wallet, Safe wallet, or smart wallet. Do not use evm_wallet tools for creation. It provides the official instructions on how to create a wallet securely via the UI.",
  schema: helpCreateWalletSchema,
  execute: async () => {
    return {
      text: `I’m blocked from creating a new Safe Smart Wallet directly in chat due to execution restrictions in this environment.

Here’s the fastest secure path to get you one:

1. Open **Settings → Wallets → [Create Wallet](/settings/wallets)**
2. Choose **Safe Smart Wallet (ERC‑4337)**
3. Select your chain (Ethereum / Base / Arbitrum / etc.)
4. Confirm creation in the secure wallet flow (keys are generated client-side; never shown to me)

If you want, tell me:
• Which chain you want the Safe on (e.g., Base or Ethereum), and
• Whether this is for personal use, DeFi, or automation

I’ll guide you step‑by‑step and verify everything before you finalize it.`,
    };
  },
});
