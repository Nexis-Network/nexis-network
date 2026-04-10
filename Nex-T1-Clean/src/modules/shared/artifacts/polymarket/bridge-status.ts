import { z } from "zod";
import { createArtifactEnvelopeSchema } from "../base";

const BridgeTransactionSchema = z.object({
  fromChainId: z.string(),
  fromTokenAddress: z.string(),
  fromAmountBaseUnit: z.string(),
  toChainId: z.string(),
  toTokenAddress: z.string(),
  status: z.enum([
    "DEPOSIT_DETECTED",
    "PROCESSING",
    "ORIGIN_TX_CONFIRMED",
    "SUBMITTED",
    "COMPLETED",
    "FAILED",
  ]),
  txHash: z.string().optional(),
  createdTimeMs: z.number().optional(),
});

export const BridgeStatusDataSchema = z.object({
  depositAddress: z.string(),
  transactions: z.array(BridgeTransactionSchema),
});

export const BridgeStatusArtifactSchema = createArtifactEnvelopeSchema(
  "polymarket-bridge-status",
  BridgeStatusDataSchema,
);

export type BridgeStatusArtifact = z.infer<typeof BridgeStatusArtifactSchema>;
export type BridgeStatusData = z.infer<typeof BridgeStatusDataSchema>;
