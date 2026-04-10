import { z } from "zod";
import { createArtifactEnvelopeSchema } from "../base";

const UserPositionSchema = z.object({
  asset: z.string(),
  conditionId: z.string(),
  market: z.string(),
  outcome: z.string(),
  outcomeIndex: z.number(),
  size: z.string(),
  avgPrice: z.string(),
  curPrice: z.string(),
  currentValue: z.string(),
  initialValue: z.string(),
  realizedPnl: z.string(),
  unrealizedPnl: z.string(),
  percentPnl: z.string(),
  cashflow: z.string(),
});

export const PositionsDataSchema = z.object({
  positions: z.array(UserPositionSchema),
  totalValue: z.string(),
  unrealizedPnl: z.string(),
});

export const PositionsArtifactSchema = createArtifactEnvelopeSchema(
  "polymarket-positions",
  PositionsDataSchema,
);

export type PositionsArtifact = z.infer<typeof PositionsArtifactSchema>;
export type PositionsData = z.infer<typeof PositionsDataSchema>;
