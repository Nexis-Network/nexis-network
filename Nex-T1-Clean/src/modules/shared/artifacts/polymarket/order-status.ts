import { z } from "zod";
import { createArtifactEnvelopeSchema } from "../base";

export const OrderStatusDataSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  side: z.enum(["BUY", "SELL"]),
  price: z.string(),
  size: z.string(),
  sizeMatched: z.string(),
  txHashes: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OrderStatusArtifactSchema = createArtifactEnvelopeSchema(
  "polymarket-order-status",
  OrderStatusDataSchema,
);

export type OrderStatusArtifact = z.infer<typeof OrderStatusArtifactSchema>;
export type OrderStatusData = z.infer<typeof OrderStatusDataSchema>;
