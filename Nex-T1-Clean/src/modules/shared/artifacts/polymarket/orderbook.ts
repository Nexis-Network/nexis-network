import { z } from "zod";
import { createArtifactEnvelopeSchema } from "../base";

const OrderBookEntrySchema = z.object({
  price: z.string(),
  size: z.string(),
});

export const OrderbookDataSchema = z.object({
  tokenId: z.string(),
  market: z.string(),
  bids: z.array(OrderBookEntrySchema),
  asks: z.array(OrderBookEntrySchema),
  spread: z.string(),
  midpoint: z.string(),
  lastPrice: z.string().optional(),
  hash: z.string(),
  timestamp: z.string(),
});

export const OrderbookArtifactSchema = createArtifactEnvelopeSchema(
  "polymarket-orderbook",
  OrderbookDataSchema,
);

export type OrderbookArtifact = z.infer<typeof OrderbookArtifactSchema>;
export type OrderbookData = z.infer<typeof OrderbookDataSchema>;
