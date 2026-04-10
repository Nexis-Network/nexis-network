export type CampaignStatusResponse = {
  ok: boolean;
  campaign?: {
    id: string;
    chainRef: string;
    chainFamily: "evm" | "solana";
    tokenStandard?: "erc20" | "erc404";
    status: string;
    riskScore?: number;
    riskFlags?: string[];
    targetBaseUnits: string;
    raisedBaseUnits: string;
    closeTs: string | null;
  } | null;
  position?: {
    id: string;
    investorUserId: string;
    sharesOwnedBaseUnits: string;
    principalBaseUnits: string;
    claimableBaseUnits: string;
    claimedBaseUnits: string;
    updatedAt: string;
  } | null;
  distributions?: Array<{
    id: string;
    networkId: string;
    assetId: string | null;
    grossBaseUnits: string;
    investorBaseUnits: string;
    epochIndex: number;
    createdAt: string;
  }>;
};

export type ReceiptTimelineResponse = {
  ok: boolean;
  receipts?: Array<{
    id: string;
    amountBaseUnits: string;
    txHash: string | null;
    signature: string;
    createdAt: string;
  }>;
};

export type TokenStandard = "erc20" | "erc404";

export const CAMPAIGN_CHAIN_OPTIONS = [
  { label: "Base", chainRef: "eip155:8453" },
  { label: "Ethereum", chainRef: "eip155:1" },
  { label: "Optimism", chainRef: "eip155:10" },
  { label: "Arbitrum", chainRef: "eip155:42161" },
  { label: "Solana", chainRef: "solana:101" },
] as const;
