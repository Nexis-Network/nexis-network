import { artifact } from "@/lib/ai/artifact-kit";
import { z } from "zod";

import {
  ArtifactMetadata,
  ArtifactMetadataSchema,
  ErrorPayload,
  ErrorPayloadSchema,
  StreamState,
  StreamStateSchema,
} from "./base";

const TableColumnProfileSchema = z.object({
  id: z.string().min(1),
  header: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "date", "currency", "unknown"]).default("unknown"),
  filled: z.number().min(0).max(1).optional(),
  uniqueValues: z.number().int().optional(),
  examples: z.array(z.string()).default([]),
  missingCount: z.number().int().optional(),
});

const TableVersionSchema = z.object({
  version: z.number().int().nonnegative(),
  label: z.string().min(1),
  description: z.string().optional(),
  csvContent: z.string(),
  createdAt: z.string().datetime(),
  operations: z.array(z.string()).default([]),
});

const TableOperationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["pending", "in_progress", "complete", "error"]).default("pending"),
  progress: z.number().min(0).max(1).default(0),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: ErrorPayloadSchema.optional(),
});

const TableSuggestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().min(1),
  category: z.enum(["cleanup", "analysis", "transform"]).default("analysis"),
});

const TableFilterSchema = z.object({
  id: z.string().min(1),
  columnId: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "gt", "gte", "lt", "lte", "between", "in", "not_in"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()])), z.tuple([z.number(), z.number()])]),
});

const TableSortSchema = z.object({
  id: z.string().min(1),
  columnId: z.string().min(1),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const TableColumnSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  dataType: z.enum(["string", "number", "boolean", "date", "currency", "json"]).default("string"),
  format: z.string().optional(),
  width: z.number().int().nonnegative().optional(),
  pinned: z.boolean().default(false),
  resolver: z.string().optional(),
});

const TableRowSchema = z.object({
  id: z.string().min(1),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const TableSummarySchema = z.object({
  rowCount: z.number().int().nonnegative().default(0),
  columnCount: z.number().int().nonnegative().default(0),
  lastUpdated: z.string().datetime().optional(),
  sampleRows: z.array(z.record(z.string(), z.string())).default([]),
  columnProfiles: z.array(TableColumnProfileSchema).default([]),
  insights: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      severity: z.enum(["info", "success", "warning", "critical"]).default("info"),
    })
  ).default([]),
});

const TableAnalysisSchema = z.object({
  headline: z.string().optional(),
  bullets: z.array(z.string()).default([]),
  metrics: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.union([z.string(), z.number()]),
      change: z.number().optional(),
      trend: z.enum(["up", "down", "flat"]).optional(),
    })
  ).default([]),
});

const TableEditorDataSchema = z.object({
  title: z.string().default("Interactive Table Artifact"),
  stage: z
    .enum(["idle", "loading", "hydrating", "transforming", "complete", "error"])
    .default("idle"),
  progress: z.number().min(0).max(1).default(0),
  csvContent: z.string().default(""),
  columns: z.array(TableColumnSchema).default([]),
  rows: z.array(TableRowSchema).default([]),
  filters: z.array(TableFilterSchema).default([]),
  sorts: z.array(TableSortSchema).default([]),
  operations: z.array(TableOperationSchema).default([]),
  currentOperation: TableOperationSchema.optional(),
  versions: z.array(TableVersionSchema).default([]),
  summary: TableSummarySchema.default({
    rowCount: 0,
    columnCount: 0,
    sampleRows: [],
    columnProfiles: [],
    insights: [],
  }),
  suggestions: z.array(TableSuggestionSchema).default([]),
  analysis: TableAnalysisSchema.optional(),
  streamCursor: z.string().optional(),
  error: ErrorPayloadSchema.optional(),
  streamStateOverride: StreamStateSchema.optional(),
  streamState: StreamStateSchema.optional(),
  metadata: ArtifactMetadataSchema.optional(),
});

export const TableEditorArtifactSchema = TableEditorDataSchema;

export type TableEditorArtifactData = z.infer<typeof TableEditorDataSchema>;
export type TableEditorArtifactPayload = TableEditorArtifactData;

export const defaultTableEditorData: TableEditorArtifactData = {
  title: "Interactive Table Artifact",
  stage: "idle",
  progress: 0,
  csvContent: "",
  columns: [],
  rows: [],
  filters: [],
  sorts: [],
  operations: [],
  versions: [],
  summary: {
    rowCount: 0,
    columnCount: 0,
    sampleRows: [],
    columnProfiles: [],
    insights: [],
  },
  suggestions: [],
  streamState: {
    completed: false,
  },
};

export function createTableEditorArtifactPayload(
  data: Partial<TableEditorArtifactData> = {},
  overrides: {
    metadata?: ArtifactMetadata;
    streamState?: StreamState;
  } = {}
): TableEditorArtifactPayload {
  const merged: TableEditorArtifactData = {
    ...defaultTableEditorData,
    ...data,
  };

  if (merged.streamStateOverride) {
    merged.streamState = merged.streamStateOverride;
    delete (merged as Partial<TableEditorArtifactData>).streamStateOverride;
  }

  if (overrides.metadata) {
    merged.metadata = ArtifactMetadataSchema.parse(overrides.metadata);
  }

  if (overrides.streamState) {
    merged.streamState = overrides.streamState;
  }

  return merged;
}

export const TableEditorArtifact = artifact<TableEditorArtifactData>(
  "table-editor",
  TableEditorArtifactSchema,
);

export interface TableArtifactUpdateOptions {
  metadata?: ArtifactMetadata;
  streamState?: StreamState;
  progress?: number;
  error?: ErrorPayload;
}
