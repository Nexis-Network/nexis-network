// Shared types for AI artifact table functionality
// Types are inferred from the TableEditorArtifact schema for consistency

import type { z } from "zod";
import { tableEditorSchema } from "./artifacts/table-editor";
 
 // Infer types from the TableEditorArtifact schema
 export type TableEditorData = z.infer<typeof tableEditorSchema>;

export type ColumnType = "number" | "boolean" | "date" | "currency" | "text";

export type OperationStatus = "pending" | "applied" | "skipped" | "applying";

export type MergeStrategy = "append" | "prepend" | "insert_at_index";

export type SortOrder = "asc" | "desc";

export type ArtifactStage =
  | "loading"
  | "profiling"
  | "editing"
  | "applying_changes"
  | "complete";

// Extract specific types from the inferred schema
export type ArtifactOperation = TableEditorData["operations"][number];
export type ArtifactVersion = TableEditorData["versions"][number];
export type ColumnProfile = NonNullable<
  NonNullable<TableEditorData["summary"]>["columnProfiles"]
>[number];
export type ArtifactSummary = NonNullable<TableEditorData["summary"]>;
export type CurrentOperation = NonNullable<TableEditorData["currentOperation"]>;

// Extended type that includes metadata not in the schema
export type ArtifactDataWithMetadata = TableEditorData & {
  artifactId?: string;
  artifactVersion?: number;
};

export type ArtifactInstance = {
  id: string;
  stream: UntypedJson; // The artifact stream instance
};
