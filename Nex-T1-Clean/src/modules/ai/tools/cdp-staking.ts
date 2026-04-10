import {
  createTool,
  createToolSchema,
  stringProp,
  enumProp,
} from "./create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import {
  stakeAsset,
  unstakeAsset,
  getStakingPositions,
  getStakingRewards,
} from "@/server/services/cdp/staking";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CdpStakeInput = {
  walletAddress: string;
  amount: string;
  asset: "eth" | "sol";
  network?: string;
};

type CdpUnstakeInput = {
  walletAddress: string;
  amount: string;
  asset: "eth" | "sol";
  stakeId?: string;
  network?: string;
};

type CdpStakingPositionsInput = {
  walletAddress: string;
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const cdpStakeSchema = createToolSchema(
  {
    walletAddress: stringProp(
      "The Nex Wallet address to stake from.",
    ),
    amount: stringProp(
      "The amount to stake in base units (wei for ETH, lamports for SOL).",
    ),
    asset: enumProp(
      "The asset to stake.",
      ["eth", "sol"] as const,
    ),
    network: stringProp(
      "Optional network override. Defaults to 'ethereum' for ETH, 'solana' for SOL.",
    ),
  },
  ["walletAddress", "amount", "asset"],
);

const cdpUnstakeSchema = createToolSchema(
  {
    walletAddress: stringProp(
      "The Nex Wallet address to unstake from.",
    ),
    amount: stringProp(
      "The amount to unstake in base units (wei for ETH, lamports for SOL).",
    ),
    asset: enumProp(
      "The asset to unstake.",
      ["eth", "sol"] as const,
    ),
    stakeId: stringProp(
      "Optional specific stake position ID to unstake from.",
    ),
    network: stringProp(
      "Optional network override.",
    ),
  },
  ["walletAddress", "amount", "asset"],
);

const cdpStakingPositionsSchema = createToolSchema(
  {
    walletAddress: stringProp(
      "The Nex Wallet address to query staking positions for.",
    ),
  },
  ["walletAddress"],
);

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

/**
 * CDP Stake Tool
 *
 * Stakes ETH or SOL from a Nex Wallet to earn staking rewards.
 * Requires explicit user approval (HITL) before execution since this is
 * a value-moving operation.
 */
export const cdpStakeTool = createTool<CdpStakeInput>({
  description:
    "Stake ETH or SOL from a Nex Wallet to earn staking rewards. " +
    "Use this when the user asks to stake their crypto assets. " +
    "ETH staking earns approximately 3-4% APY, SOL staking earns approximately 6-7% APY. " +
    "The amount must be provided in base units (wei for ETH, lamports for SOL).",
  schema: cdpStakeSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to stake assets from a Nex Wallet.");
    }

    const assetSymbol = input.asset === "eth" ? "ETH" : "SOL";
    const unitLabel = input.asset === "eth" ? "wei" : "lamports";

    // Create HITL approval request
    const approvalPayload: ApprovalPayload = {
      toolId: "cdp_wallet",
      command: "cdp_wallet_stake",
      args: {
        walletAddress: String(input.walletAddress),
        amount: String(input.amount),
        asset: String(input.asset),
        network: input.network ?? null,
      },
      preview: {
        title: `Stake ${assetSymbol}`,
        description: `Approve staking ${assetSymbol} from your Nex Wallet to earn rewards.`,
        items: [
          {
            label: "Wallet",
            value: String(input.walletAddress),
            highlight: true,
          },
          {
            label: `Amount (${unitLabel})`,
            value: String(input.amount),
            highlight: true,
          },
          {
            label: "Asset",
            value: assetSymbol,
          },
          {
            label: "Network",
            value: input.network ?? (input.asset === "eth" ? "ethereum" : "solana"),
          },
        ],
        warnings: [
          `This action stakes ${assetSymbol} on-chain and requires explicit approval.`,
          input.asset === "eth"
            ? "ETH staking has an unbonding period. Funds will not be immediately available upon unstaking."
            : "SOL unstaking has a cooldown period of approximately 2-3 days.",
        ],
      },
      operationType: "stake",
    };

    const approvalRequest = await createApprovalRequest(userId, approvalPayload);
    const decision = await waitForApproval(approvalRequest.id, userId);

    if (!decision.approved) {
      return {
        status: "rejected",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message:
          decision.reason ??
          `Staking rejected: explicit user confirmation is required.`,
      };
    }

    try {
      const result = await stakeAsset(
        {
          walletAddress: input.walletAddress,
          amount: input.amount,
          asset: input.asset,
          network: input.network,
        },
        userId,
      );

      return {
        status: "success",
        stakeId: result.stakeId,
        txHash: result.txHash,
        amount: result.amount,
        asset: result.asset,
        estimatedApy: result.estimatedApy,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: `Successfully staked ${assetSymbol}. Transaction hash: ${result.txHash}. Estimated APY: ${result.estimatedApy}%.`,
      };
    } catch (error: UntypedJson) {
      return {
        status: "error",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        error:
          error instanceof Error
            ? error.message
            : `Unknown error during ${assetSymbol} staking`,
      };
    }
  },
});

/**
 * CDP Unstake Tool
 *
 * Unstakes ETH or SOL from a staking position on a Nex Wallet.
 * Requires explicit user approval (HITL) before execution since this is
 * a value-moving operation.
 */
export const cdpUnstakeTool = createTool<CdpUnstakeInput>({
  description:
    "Unstake ETH or SOL from a staking position on a Nex Wallet. " +
    "Use this when the user asks to unstake or withdraw their staked assets. " +
    "Note: ETH unstaking has an unbonding period, SOL unstaking takes 2-3 days. " +
    "The amount must be provided in base units (wei for ETH, lamports for SOL).",
  schema: cdpUnstakeSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to unstake assets from a Nex Wallet.");
    }

    const assetSymbol = input.asset === "eth" ? "ETH" : "SOL";
    const unitLabel = input.asset === "eth" ? "wei" : "lamports";

    // Create HITL approval request
    const approvalPayload: ApprovalPayload = {
      toolId: "cdp_wallet",
      command: "cdp_wallet_unstake",
      args: {
        walletAddress: String(input.walletAddress),
        amount: String(input.amount),
        asset: String(input.asset),
        stakeId: input.stakeId ?? null,
        network: input.network ?? null,
      },
      preview: {
        title: `Unstake ${assetSymbol}`,
        description: `Approve unstaking ${assetSymbol} from your staking position.`,
        items: [
          {
            label: "Wallet",
            value: String(input.walletAddress),
            highlight: true,
          },
          {
            label: `Amount (${unitLabel})`,
            value: String(input.amount),
            highlight: true,
          },
          {
            label: "Asset",
            value: assetSymbol,
          },
          ...(input.stakeId
            ? [{ label: "Stake ID", value: String(input.stakeId) }]
            : []),
        ],
        warnings: [
          `This action unstakes ${assetSymbol} on-chain and requires explicit approval.`,
          input.asset === "eth"
            ? "ETH unstaking has an unbonding period. Funds will not be immediately available."
            : "SOL unstaking has a cooldown period of approximately 2-3 days.",
        ],
      },
    };

    const approvalRequest = await createApprovalRequest(userId, approvalPayload);
    const decision = await waitForApproval(approvalRequest.id, userId);

    if (!decision.approved) {
      return {
        status: "rejected",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message:
          decision.reason ??
          `Unstaking rejected: explicit user confirmation is required.`,
      };
    }

    try {
      const result = await unstakeAsset(
        {
          walletAddress: input.walletAddress,
          amount: input.amount,
          asset: input.asset,
          stakeId: input.stakeId,
          network: input.network,
        },
        userId,
      );

      return {
        status: "success",
        stakeId: result.stakeId,
        txHash: result.txHash,
        amount: result.amount,
        asset: result.asset,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: `Successfully initiated ${assetSymbol} unstaking. Transaction hash: ${result.txHash}.`,
      };
    } catch (error: UntypedJson) {
      return {
        status: "error",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        error:
          error instanceof Error
            ? error.message
            : `Unknown error during ${assetSymbol} unstaking`,
      };
    }
  },
});

/**
 * CDP Staking Positions Tool
 *
 * Read-only tool that retrieves staking positions and rewards for a Nex Wallet.
 * No HITL approval needed since this is a read-only operation.
 */
export const cdpStakingPositionsTool = createTool<CdpStakingPositionsInput>({
  description:
    "Get staking positions and rewards for a Nex Wallet. " +
    "Use this when the user asks about their staking status, staked amounts, rewards, or APY. " +
    "Returns both ETH and SOL staking positions with current rewards and APY data.",
  schema: cdpStakingPositionsSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to query staking positions.");
    }

    // Fetch both positions and rewards in parallel
    const [positions, rewards] = await Promise.all([
      getStakingPositions(input.walletAddress, userId),
      getStakingRewards(input.walletAddress, userId),
    ]);

    const activePositions = positions.filter((p) => p.status === "active");
    const totalStakedEth = positions
      .filter((p) => p.asset === "eth" && p.status === "active")
      .reduce((sum, p) => sum + BigInt(p.amount || "0"), 0n);
    const totalStakedSol = positions
      .filter((p) => p.asset === "sol" && p.status === "active")
      .reduce((sum, p) => sum + BigInt(p.amount || "0"), 0n);

    return {
      walletAddress: input.walletAddress,
      positions,
      rewards: {
        totalRewards: rewards.totalRewards,
        totalRewardsUsd: rewards.totalRewardsUsd,
        breakdown: rewards.positions,
      },
      summary: {
        totalPositions: positions.length,
        activePositions: activePositions.length,
        totalStakedEthWei: totalStakedEth.toString(),
        totalStakedSolLamports: totalStakedSol.toString(),
        totalRewardsUsd: rewards.totalRewardsUsd,
      },
    };
  },
});
