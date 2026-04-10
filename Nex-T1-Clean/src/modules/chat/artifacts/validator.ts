import { z } from "zod";

import { MarketTerminalArtifactSchema } from "@/modules/shared/artifacts/market-terminal";
import { PumpFunArtifactDataSchema } from "@/modules/shared/artifacts/pumpfun";
import { PumpFunV2ArtifactDataSchema } from "@/modules/shared/artifacts/pumpfun-v2";

import { logger } from "@/lib/logger";
import { jsonRecordSchema } from "@/lib/validation/json";
type ValidatedArtifact = {
  type: string;
  content: UntypedJson;
  error?: string;
};

// Schema for Burn Rate Charts
export const BurnRateSchema = z.object({
  title: z.string(),
  data: z
    .array(
      z.object({
        date: z.string(),
        burn: z.number(),
        treasury: z.number(),
      }),
    )
    .default([]),
});

// Schema for Table Editor
export const TableEditorSchema = z
  .object({
    columns: z.array(
      z.object({
        key: z.string(),
        header: z.string().optional(),
        label: z.string().optional(), // Alias for header
        type: z.string().optional(),
      }),
    ),
    data: z.array(jsonRecordSchema).optional(),
    rows: z.array(jsonRecordSchema).optional(), // Alias for data
  })
  .refine((val) => (val.data?.length ?? 0) > 0 || (val.rows?.length ?? 0) > 0, {
    message: "Must provide either 'data' or 'rows'",
    path: ["data"],
  });

// Schema for Agent Wallets
export const AgentWalletsSchema = z.object({
  wallets: z.array(
    z.object({
      address: z.string(),
      chain: z.string(),
      balance: z.string().optional(),
      totalValue: z.number().optional(),
      change24h: z.number().optional(),
      tags: z.array(z.string()).optional(),
      exportHint: z.string().optional(),
      assets: z
        .array(
          z.object({
            symbol: z.string(),
            amount: z.number(),
            value: z.number(),
            change24h: z.number().optional(),
            price: z.number().optional(),
          }),
        )
        .optional(),
    }),
  ),
});

// Schema for Portfolio Analysis
export const PortfolioAnalysisSchema = z.object({
  totalValue: z.number(),
  change24h: z.number(),
  riskScore: z.number().min(0).max(100),
  assets: z.array(
    z.object({
      symbol: z.string(),
      amount: z.number(),
      value: z.number(),
      allocation: z.number(), // Percentage
    }),
  ),
  insights: z.array(z.string()).optional(),
});

// Schema for Combined Holdings
export const CombinedHoldingsSchema = z.object({
  wallets: z.array(z.string()), // Addresses included
  totalValue: z.number(),
  assets: z.array(
    z.object({
      symbol: z.string(),
      chain: z.string(),
      amount: z.number(),
      value: z.number(),
      source: z.enum(["in-app", "agent-generated"]),
    }),
  ),
});

// Schema for Staking Positions
export const StakingPositionsSchema = z.object({
  totalStaked: z.number(),
  averageApy: z.number(),
  positions: z.array(
    z.object({
      protocol: z.string(),
      asset: z.string(),
      amount: z.number(),
      value: z.number(),
      apy: z.number(),
      rewardsPending: z.number().optional(),
    }),
  ),
});

// Schema for Agent DAOs
export const AgentDaosSchema = z.object({
  daos: z.array(
    z.object({
      name: z.string(),
      contractAddress: z.string(),
      chain: z.string(),
      treasuryValue: z.number(),
      proposalCount: z.number(),
      governanceToken: z.string(),
      role: z.string().optional(), // User's role if any
    }),
  ),
});

// Schema for Interactive Charts
export const InteractiveChartSchema = z.object({
  config: z.object({
    type: z.enum(["line", "bar", "scatter", "pie", "area", "composed"]),
    title: z.string(),
    description: z.string().optional(),
    xAxisKey: z.string(),
    yAxisKeys: z.array(z.string()),
    colors: z.record(z.string()).optional(),
    xAxisLabel: z.string().optional(),
    yAxisLabel: z.string().optional(),
    zAxisKey: z.string().optional(), // For scatter
    nameKey: z.string().optional(), // For pie
    dataKey: z.string().optional(), // For pie
  }),
  data: z.array(z.record(z.union([z.string(), z.number()]))),
});

export const validateArtifact = (type: string, rawJson: unknown) => {
  try {
    const rawTypes = [
      "code",
      "preview",
      "html",
      "canvas",
      "text",
      "markdown",
      "web",
    ];
    // If it's a raw type, don't try to parse JSON if it looks like a string
    const shouldParseJson = !rawTypes.includes(type);

    // If rawJson is already an object, use it. If string, parse it ONLY if allowed or if it looks like JSON
    let parsed = rawJson;
    if (typeof rawJson === "string") {
      if (
        shouldParseJson ||
        (rawJson.trim().startsWith("{") && rawJson.trim().endsWith("}"))
      ) {
        try {
          parsed = JSON.parse(rawJson);
        } catch {
          // if parse fails but we aren't strict, keep raw
          if (!shouldParseJson) parsed = rawJson;
          else throw new Error("Invalid JSON");
        }
      }
    }

    // Support both "raw data" artifacts and envelope-shaped tool artifacts.
    const parsedRecord =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, UntypedJson>)
        : null;
    const parsedIdentifier =
      typeof parsedRecord?.identifier === "string"
        ? parsedRecord.identifier
        : null;
    const parsedType =
      typeof parsedRecord?.type === "string" ? parsedRecord.type : null;
    const identifier =
      parsedIdentifier ??
      (parsedType && !parsedType.includes("/") ? parsedType : type);
    const content =
      parsedRecord && "data" in parsedRecord
        ? parsedRecord.data
        : (parsedRecord?.content ?? parsed);

    if (identifier === "pumpfun") {
      const result = PumpFunArtifactDataSchema.safeParse(content);
      if (!result.success) {
        logger.error("Artifact Validation Failed (PumpFun):", result.error);
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "pumpfun",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "pumpfun-v2") {
      const result = PumpFunV2ArtifactDataSchema.safeParse(content);
      if (!result.success) {
        logger.error("Artifact Validation Failed (PumpFunV2):", result.error);
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "pumpfun-v2",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "burn-rate-chart") {
      const result = BurnRateSchema.safeParse(content);
      if (!result.success) {
        logger.error("Artifact Validation Failed (BurnRate):", result.error);
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "burn-rate-chart",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "table-editor") {
      const result = TableEditorSchema.safeParse(content);
      if (!result.success) {
        logger.error("Artifact Validation Failed (TableEditor):", result.error);
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "table-editor",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "market-terminal") {
      const result = MarketTerminalArtifactSchema.safeParse(content);
      if (!result.success) {
        logger.error("Artifact Validation Failed (MarketTerminal):", result.error);
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "market-terminal",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "agent-wallets") {
      const result = AgentWalletsSchema.safeParse(content);
      if (!result.success) {
        logger.error(
          "Artifact Validation Failed (AgentWallets):",
          result.error,
        );
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "agent-wallets",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "portfolio-analysis") {
      const result = PortfolioAnalysisSchema.safeParse(content);
      if (!result.success) {
        logger.error(
          "Artifact Validation Failed (PortfolioAnalysis):",
          result.error,
        );
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "portfolio-analysis",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "combined-holdings") {
      const result = CombinedHoldingsSchema.safeParse(content);
      if (!result.success) {
        logger.error(
          "Artifact Validation Failed (CombinedHoldings):",
          result.error,
        );
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "combined-holdings",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "staking-positions") {
      const result = StakingPositionsSchema.safeParse(content);
      if (!result.success) {
        logger.error(
          "Artifact Validation Failed (StakingPositions):",
          result.error,
        );
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "staking-positions",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "agent-daos") {
      const result = AgentDaosSchema.safeParse(content);
      if (!result.success) {
        logger.error("Artifact Validation Failed (AgentDaos):", result.error);
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "agent-daos",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    if (identifier === "interactive-chart") {
      const result = InteractiveChartSchema.safeParse(content);
      if (!result.success) {
        logger.error(
          "Artifact Validation Failed (InteractiveChart):",
          result.error,
        );
        return {
          type: "text",
          content: JSON.stringify(content, null, 2),
          error: "Visualization failed",
        } satisfies ValidatedArtifact;
      }
      return {
        type: "interactive-chart",
        content: result.data,
      } satisfies ValidatedArtifact;
    }

    // Default pass-through if no specific schema matches
    return { type: identifier, content } satisfies ValidatedArtifact;
  } catch (e) {
    logger.error("Artifact JSON Parse Failed:", e);
    return {
      type: "text",
      content: String(rawJson),
      error: "Invalid JSON",
    } satisfies ValidatedArtifact;
  }
};
