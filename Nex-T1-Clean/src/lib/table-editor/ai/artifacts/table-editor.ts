import { artifact } from "@/lib/ai/artifact-kit";
import { z } from "zod";

export const tableEditorSchema = z.object({
    title: z.string(),
    stage: z
      .enum(["loading", "profiling", "editing", "applying_changes", "complete"])
      .default("loading"),
    progress: z.number().min(0).max(1).default(0),
    csvContent: z.string().default(""),
    summary: z
      .object({
        rowCount: z.number().optional(),
        columnCount: z.number().optional(),
        sampleRows: z.array(z.record(z.string(), z.string())).optional(),
        columnProfiles: z
          .array(
            z.object({
              name: z.string(),
              inferredType: z
                .enum(["number", "currency", "date", "text", "boolean"])
                .default("text"),
              filled: z.number().min(0).max(1).optional(),
              examples: z.array(z.string()).default([]),
            })
          )
          .optional(),
      })
      .optional(),
    operations: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          status: z.enum(["pending", "applied", "skipped", "applying"]),
          preview: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .default([]),
    versions: z
      .array(
        z.object({
          version: z.number(),
          label: z.string(),
          csvContent: z.string(),
          createdAt: z.number(),
          description: z.string().optional(),
          operations: z.array(z.string()).optional(),
        })
      )
      .default([]),
    currentOperation: z
      .object({
        id: z.string(),
        label: z.string(),
        progress: z.number().min(0).max(1).default(0),
      })
      .optional(),
  });

export type TableEditorArtifactData = z.infer<typeof tableEditorSchema>;

export const TableEditorArtifact = artifact<TableEditorArtifactData>(
  "table-editor",
  tableEditorSchema,
);
