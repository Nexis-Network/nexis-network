import { artifact } from "@/lib/ai/artifact-kit";
import { z } from "zod";

import {
    ArtifactMetadataSchema,
    StreamStateSchema,
} from "./base";

const AssetSchema = z.object({
    symbol: z.string(),
    amount: z.number(),
    value: z.number(),
    change24h: z.number().optional(),
    price: z.number().optional(),
});

const WalletDataSchema = z.object({
    address: z.string(),
    chain: z.string(),
    balance: z.string().optional(),
    totalValue: z.number().optional(),
    change24h: z.number().optional(),
    tags: z.array(z.string()).optional(),
    exportHint: z.string().optional(),
    assets: z.array(AssetSchema).optional(),
});

const AgentWalletsDataSchema = z.object({
    title: z.string().default("Agent Wallets"),
    wallets: z.array(WalletDataSchema).default([]),
    streamState: StreamStateSchema.optional(),
    metadata: ArtifactMetadataSchema.optional(),
});

export const AgentWalletsArtifactSchema = AgentWalletsDataSchema;

export type AgentWalletsArtifactData = z.infer<typeof AgentWalletsDataSchema>;

export const AgentWalletsArtifact = artifact<AgentWalletsArtifactData>(
  "agent-wallets",
  AgentWalletsArtifactSchema,
);
