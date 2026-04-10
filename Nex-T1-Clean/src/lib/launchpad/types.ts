export type LaunchpadCampaignScope = "all" | "invested" | "managed";

export type LaunchpadCampaignStatus = "draft" | "active" | "finalized" | "cancelled";

export type LaunchpadCampaignTokenStandard = "erc20" | "erc404";

export type LaunchpadCampaignItem = {
  id: string;
  orgId: string;
  agentId: string;
  chainFamily: "evm" | "solana";
  chainRef: string;
  tokenStandard: LaunchpadCampaignTokenStandard;
  launchControls: Record<string, unknown>;
  compliancePolicy: Record<string, unknown>;
  riskScore: number;
  riskFlags: string[];
  acceptedAssets: string[];
  status: LaunchpadCampaignStatus;
  campaignAddress: string | null;
  shareTokenAddress: string | null;
  treasuryAddress: string | null;
  targetBaseUnits: string;
  raisedBaseUnits: string;
  progressBps: number;
  closeTs: string | null;
  createdAt: string;
  updatedAt: string;
  agent: {
    id: string;
    slug: string;
    name: string;
    avatarUrl: string | null;
    visibility: "public" | "private" | "unlisted";
  };
  permissions: {
    isMember: boolean;
    canManage: boolean;
  };
  position: {
    sharesOwnedBaseUnits: string;
    principalBaseUnits: string;
    claimableBaseUnits: string;
    claimedBaseUnits: string;
  } | null;
};

export type LaunchpadCampaignListResponse = {
  ok: boolean;
  items: LaunchpadCampaignItem[];
};

export type LaunchpadCampaignSaleRound = "Preparation" | "Whitelist" | "Public" | "Closed";

export type LaunchpadCampaignParticipant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  walletAddress: string | null;
  walletNamespace: string | null;
  contributionCount: number;
  totalContributedBaseUnits: string;
  totalSharesBaseUnits: string;
  latestContributionAt: string;
  lastTxHash: string | null;
};

export type LaunchpadCampaignTeamMember = {
  userId: string;
  role: "owner" | "admin" | "manager" | "viewer";
  displayName: string;
  avatarUrl: string | null;
  walletAddress: string | null;
  walletNamespace: string | null;
  joinedAt: string | null;
};

export type LaunchpadCampaignDistributionEpoch = {
  id: string;
  epochIndex: number;
  networkId: string;
  assetId: string | null;
  grossBaseUnits: string;
  investorBaseUnits: string;
  creatorBaseUnits: string;
  operatorBaseUnits: string;
  txHash: string | null;
  createdAt: string;
};

export type LaunchpadCampaignReceiptMetadata = {
  epochIndex?: number;
  allocationRank?: number;
  payoutTxHashes?: string[];
  [key: string]: unknown;
};

export type LaunchpadCampaignReceipt = {
  id: string;
  distributionId: string | null;
  recipientUserId: string | null;
  recipientAddress: string | null;
  networkId: string;
  assetId: string | null;
  amountBaseUnits: string;
  txHash: string | null;
  signature: string;
  metadata: LaunchpadCampaignReceiptMetadata;
  createdAt: string;
};

export type LaunchpadCampaignDetail = LaunchpadCampaignItem & {
  description: string | null;
  valuationCapBaseUnits: string | null;
  minContributionBaseUnits: string;
  maxContributionBaseUnits: string | null;
  revenuePolicy: {
    creatorBps: number;
    operatorBps: number;
    investorBps: number;
    creatorTreasury: string | null;
    operatorTreasury: string | null;
  };
  saleRound: LaunchpadCampaignSaleRound;
  totals: {
    participantCount: number;
    contributionCount: number;
    sharesMintedBaseUnits: string;
    spotPriceBaseUnits: string | null;
  };
  participants: LaunchpadCampaignParticipant[];
  team: LaunchpadCampaignTeamMember[];
  distributions: LaunchpadCampaignDistributionEpoch[];
};

export type LaunchpadCampaignDetailResponse = {
  ok: boolean;
  item: LaunchpadCampaignDetail;
};

export type LaunchpadCampaignReceiptsResponse = {
  ok: boolean;
  campaign: {
    id: string;
    riskScore: number;
    riskFlags: string[];
  };
  receipts: LaunchpadCampaignReceipt[];
};
