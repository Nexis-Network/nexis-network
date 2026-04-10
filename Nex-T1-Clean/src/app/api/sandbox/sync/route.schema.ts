import { z } from "zod";

import { FilePathSchema } from "../files/route.schema";

const SyncFileSchema = z.object({
  path: FilePathSchema,
  content: z.string().max(1024 * 1024).optional(),
});

export const SandboxSyncSchema = z.object({
  sandboxId: z.string().min(1).max(128),
  files: z
    .union([
      z.array(SyncFileSchema).max(200),
      z.record(FilePathSchema, z.string().max(1024 * 1024)),
    ])
    .default([]),
});

export type SandboxSyncFileUpdate = {
  content?: string;
  path: string;
};

export function getSandboxSyncUpdates(
  files: z.infer<typeof SandboxSyncSchema>["files"],
): SandboxSyncFileUpdate[] {
  if (Array.isArray(files)) {
    return files;
  }

  return Object.entries(files).map(([path, content]) => ({ path, content }));
}
