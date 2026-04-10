import { z } from "zod";

import { artifact } from "@/lib/ai/artifact-kit";
import {
  ArtifactMetadataSchema,
  StreamStateSchema,
} from "@/modules/shared/artifacts/base";

const AgentDaoItemSchema = z.object({
  name: z.string(),
  chain: z.string(),
  role: z.string(),
  treasuryValue: z.number().default(0),
  proposalCount: z.number().int().default(0),
  contractAddress: z.string(),
  category: z.string().optional(),
  ownershipMode: z.string().optional(),
  lifecycleState: z.string().optional(),
});

const AgentDaosArtifactDataSchema = z.object({
  title: z.string().default("Agent Managed DAOs"),
  daos: z.array(AgentDaoItemSchema).default([]),
  summary: z.string().optional(),
  streamState: StreamStateSchema.optional(),
  metadata: ArtifactMetadataSchema.optional(),
});

export type AgentDaosArtifactData = z.infer<typeof AgentDaosArtifactDataSchema>;

export const AgentDaosArtifactRecord = artifact<AgentDaosArtifactData>(
  "agent-daos",
  AgentDaosArtifactDataSchema,
);
