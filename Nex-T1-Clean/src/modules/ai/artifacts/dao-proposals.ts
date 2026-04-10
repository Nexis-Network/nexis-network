import { z } from "zod";

import { artifact } from "@/lib/ai/artifact-kit";
import type { DaoProposal, DaoVote } from "@/modules/daos/contracts";
import { daoProposalSchema, daoVoteSchema } from "@/modules/daos/contracts";
import {
  ArtifactMetadataSchema,
  StreamStateSchema,
} from "@/modules/shared/artifacts/base";

const DaoProposalsArtifactDataSchema = z.object({
  title: z.string().default("DAO Proposals"),
  daoId: z.string(),
  daoName: z.string(),
  chainFamily: z.enum(["evm", "solana"]),
  proposals: z.array(daoProposalSchema).default([]),
  votes: z.array(daoVoteSchema).default([]),
  summary: z.string().optional(),
  streamState: StreamStateSchema.optional(),
  metadata: ArtifactMetadataSchema.optional(),
});

export type DaoProposalsArtifactData = {
  title: string;
  daoId: string;
  daoName: string;
  chainFamily: "evm" | "solana";
  proposals: DaoProposal[];
  votes: DaoVote[];
  summary?: string;
  streamState?: z.infer<typeof StreamStateSchema>;
  metadata?: z.infer<typeof ArtifactMetadataSchema>;
};

export const DaoProposalsArtifactRecord = artifact<DaoProposalsArtifactData>(
  "dao-proposals",
  DaoProposalsArtifactDataSchema,
);
