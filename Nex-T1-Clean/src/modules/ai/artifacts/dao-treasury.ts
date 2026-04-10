import { z } from "zod";

import { artifact } from "@/lib/ai/artifact-kit";
import type {
  DaoTreasury,
  DaoTreasuryAction,
} from "@/modules/daos/contracts";
import {
  daoTreasuryActionSchema,
  daoTreasurySchema,
} from "@/modules/daos/contracts";
import {
  ArtifactMetadataSchema,
  StreamStateSchema,
} from "@/modules/shared/artifacts/base";

const DaoTreasuryArtifactDataSchema = z.object({
  title: z.string().default("DAO Treasury"),
  daoId: z.string(),
  daoName: z.string(),
  chainFamily: z.enum(["evm", "solana"]),
  treasuries: z.array(daoTreasurySchema).default([]),
  actions: z.array(daoTreasuryActionSchema).default([]),
  summary: z.string().optional(),
  streamState: StreamStateSchema.optional(),
  metadata: ArtifactMetadataSchema.optional(),
});

export type DaoTreasuryArtifactData = {
  title: string;
  daoId: string;
  daoName: string;
  chainFamily: "evm" | "solana";
  treasuries: DaoTreasury[];
  actions: DaoTreasuryAction[];
  summary?: string;
  streamState?: z.infer<typeof StreamStateSchema>;
  metadata?: z.infer<typeof ArtifactMetadataSchema>;
};

export const DaoTreasuryArtifactRecord = artifact<DaoTreasuryArtifactData>(
  "dao-treasury",
  DaoTreasuryArtifactDataSchema,
);
