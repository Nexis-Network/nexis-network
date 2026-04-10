import { z } from "zod";
import { createArtifactEnvelopeSchema } from "../base";

const OutcomeSchema = z.object({
  name: z.string(),
  tokenId: z.string(),
  price: z.string(),
});

const MarketItemSchema = z.object({
  conditionId: z.string(),
  question: z.string(),
  slug: z.string(),
  outcomes: z.array(OutcomeSchema),
  volume: z.string(),
  liquidity: z.string(),
  endDate: z.string().optional(),
  negRisk: z.boolean(),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const MarketListDataSchema = z.object({
  markets: z.array(MarketItemSchema),
  total: z.number(),
  hasMore: z.boolean(),
});

export const MarketListArtifactSchema = createArtifactEnvelopeSchema(
  "polymarket-markets",
  MarketListDataSchema,
);

export type MarketListArtifact = z.infer<typeof MarketListArtifactSchema>;
export type MarketListData = z.infer<typeof MarketListDataSchema>;
