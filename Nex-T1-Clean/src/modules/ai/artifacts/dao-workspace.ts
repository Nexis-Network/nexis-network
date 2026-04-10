import { z } from "zod";

import { artifact } from "@/lib/ai/artifact-kit";
import type { DaoOverview } from "@/modules/daos/contracts";
import { daoOverviewSchema } from "@/modules/daos/contracts";
import {
  ArtifactMetadataSchema,
  StreamStateSchema,
} from "@/modules/shared/artifacts/base";

const DaoWorkspaceArtifactDataSchema = z.object({
  title: z.string().default("DAO Workspace"),
  overview: daoOverviewSchema,
  summary: z.string().optional(),
  focusTab: z
    .enum([
      "overview",
      "proposals",
      "treasury",
      "members",
      "capabilities",
      "activity",
      "settings",
    ])
    .optional(),
  streamState: StreamStateSchema.optional(),
  metadata: ArtifactMetadataSchema.optional(),
});

export type DaoWorkspaceArtifactData = {
  title: string;
  overview: DaoOverview;
  summary?: string;
  focusTab?:
    | "overview"
    | "proposals"
    | "treasury"
    | "members"
    | "capabilities"
    | "activity"
    | "settings";
  streamState?: z.infer<typeof StreamStateSchema>;
  metadata?: z.infer<typeof ArtifactMetadataSchema>;
};

export const DaoWorkspaceArtifactRecord = artifact<DaoWorkspaceArtifactData>(
  "dao-workspace",
  DaoWorkspaceArtifactDataSchema,
);
