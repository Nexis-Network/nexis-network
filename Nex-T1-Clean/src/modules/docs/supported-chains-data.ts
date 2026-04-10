export type SupportedChainRecord = {
  id: string;
  name: string;
  icon: string;
  family: "EVM" | "Solana";
  bestFor: string;
  notes: string;
};

export const SUPPORTED_EVM_CHAINS: SupportedChainRecord[] = [
  {
    id: "base",
    name: "Base",
    icon: "/assets/chain-icons/base.svg",
    family: "EVM",
    bestFor: "Managed wallet flows, portfolio review, treasury operations, and general trading workflows.",
    notes: "A common default for wallet and treasury actions, depending on your connected accounts and available balances.",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    icon: "/assets/chain-icons/ethereum.svg",
    family: "EVM",
    bestFor: "Large-cap portfolio review, approvals, and research-heavy planning.",
    notes: "Useful for high-liquidity assets and wallet visibility, with higher transaction cost considerations.",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    icon: "/assets/chain-icons/arbitrum.svg",
    family: "EVM",
    bestFor: "Lower-cost execution, treasury operations, and active trading support.",
    notes: "Available where the connected wallet or treasury setup supports the target action.",
  },
  {
    id: "optimism",
    name: "Optimism",
    icon: "/assets/chain-icons/optimism.svg",
    family: "EVM",
    bestFor: "Cost-aware trading and treasury planning.",
    notes: "Useful when you want EVM compatibility with lower transaction overhead.",
  },
  {
    id: "polygon",
    name: "Polygon",
    icon: "/assets/chain-icons/polygon.svg",
    family: "EVM",
    bestFor: "Lower-cost activity, prediction-market account preparation, and wallet-linked workflows.",
    notes: "Prediction-market related steps can depend on credentials, eligibility, and account configuration.",
  },
  {
    id: "bnb-chain",
    name: "BNB Chain",
    icon: "/assets/chain-icons/bnb-chain.svg",
    family: "EVM",
    bestFor: "Exchange-adjacent market activity and broader asset visibility.",
    notes: "Use when your connected wallet, balances, and routing path support the intended action.",
  },
  {
    id: "avalanche",
    name: "Avalanche",
    icon: "/assets/chain-icons/avalanche.svg",
    family: "EVM",
    bestFor: "Treasury operations and multi-chain asset review.",
    notes: "Execution depth varies by wallet type, asset support, and the specific workflow you are running.",
  },
  {
    id: "celo",
    name: "Celo",
    icon: "/assets/chain-icons/celo.svg",
    family: "EVM",
    bestFor: "Additional treasury and wallet coverage for supported EVM accounts.",
    notes: "Best treated as workflow-specific coverage rather than an assumption that every action is available.",
  },
];
