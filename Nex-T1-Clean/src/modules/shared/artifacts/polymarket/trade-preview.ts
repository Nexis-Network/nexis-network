import { z } from "zod";
import { createArtifactEnvelopeSchema } from "../base";

export const TradePreviewDataSchema = z.object({
  market: z.object({
    conditionId: z.string(),
    question: z.string(),
  }),
  order: z.object({
    tokenId: z.string(),
    side: z.enum(["BUY", "SELL"]),
    price: z.number(),
    size: z.number(),
    orderType: z.enum(["GTC", "GTD", "FOK", "FAK"]),
    tickSize: z.string(),
    negRisk: z.boolean(),
  }),
  estimate: z.object({
    cost: z.string(),
    fees: z.string(),
    total: z.string(),
    potentialPayout: z.string(),
  }),
  approvalToken: z.string(),
});

export const TradePreviewArtifactSchema = createArtifactEnvelopeSchema(
  "polymarket-trade-preview",
  TradePreviewDataSchema,
);

export type TradePreviewArtifact = z.infer<typeof TradePreviewArtifactSchema>;
export type TradePreviewData = z.infer<typeof TradePreviewDataSchema>;
