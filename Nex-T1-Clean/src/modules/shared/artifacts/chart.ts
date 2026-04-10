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

const ChartSeriesPointSchema = z.object({
  x: z.union([z.string(), z.number()]).describe("X-axis value (timestamp, label, or numeric bucket)."),
  y: z.number().describe("Y-axis value."),
  timestamp: z.string().datetime().optional().describe("ISO timestamp for time-series data."),
  formattedValue: z.string().optional().describe("Pre-formatted display value."),
  confidence: z.number().min(0).max(1).optional().describe("Optional confidence interval for the point."),
  context: z.record(z.string(), z.unknown()).optional().describe("Additional metadata for drill-ins or tooltips."),
});

const ChartDatasetSchema = z.object({
  id: z.string().min(1).describe("Dataset identifier used for streaming updates."),
  label: z.string().min(1).describe("Human readable dataset label."),
  type: z.enum(["line", "bar", "area", "scatter"]).default("line"),
  axis: z.enum(["primary", "secondary"]).default("primary"),
  color: z.string().optional(),
  strokeWidth: z.number().min(1).max(6).optional(),
  values: z.array(ChartSeriesPointSchema).default([]),
});

const ChartThresholdSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  type: z.enum(["upper", "lower", "target"]).default("target"),
  color: z.string().optional(),
  description: z.string().optional(),
});

const ChartInsightSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["info", "success", "warning", "critical"]).default("info"),
  tags: z.array(z.string()).default([]),
  relatedDatasetIds: z.array(z.string()).default([]),
});

const ChartMetricSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  formattedValue: z.string().optional(),
  delta: z.number().optional(),
  deltaPercentage: z.number().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
  period: z.string().optional(),
});

const ChartActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  variant: z.enum(["default", "secondary", "destructive", "ghost"]).default("default"),
});

const ChartFilterSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["select", "multi-select", "range", "toggle"]).default("select"),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.tuple([z.number(), z.number()])]).optional(),
  options: z
    .array(
      z.object({
        value: z.union([z.string(), z.number()]),
        label: z.string(),
      })
    )
    .optional(),
});

const ChartControlSchema = z.object({
  filters: z.array(ChartFilterSchema).default([]),
  actions: z.array(ChartActionSchema).default([]),
});

const ChartPanelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  body: z.string().optional(),
  metrics: z.array(ChartMetricSchema).default([]),
  insights: z.array(ChartInsightSchema).default([]),
  expanded: z.boolean().default(false),
});

const ChartArtifactDataSchema = z.object({
  stage: z
    .enum(["idle", "loading", "streaming", "analyzing", "complete", "error"])
    .default("idle")
    .describe("Current lifecycle stage for the artifact."),
  progress: z.number().min(0).max(1).default(0),
  chartType: z.enum(["line", "bar", "area", "mixed"]).default("line"),
  timeframe: z.string().default("30d"),
  datasets: z.array(ChartDatasetSchema).default([]),
  thresholds: z.array(ChartThresholdSchema).default([]),
  metrics: z.array(ChartMetricSchema).default([]),
  panels: z.array(ChartPanelSchema).default([]),
  insights: z.array(ChartInsightSchema).default([]),
  controls: ChartControlSchema.default({ filters: [], actions: [] }),
  annotations: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        description: z.string().optional(),
        timestamp: z.string().datetime(),
        datasetId: z.string().optional(),
      })
    )
    .default([]),
  streamSummary: z
    .object({
      eventsProcessed: z.number().int().nonnegative().default(0),
      lastEventAt: z.string().datetime().optional(),
    })
    .default({ eventsProcessed: 0 }),
  error: ErrorPayloadSchema.optional(),
  streamStateOverride: StreamStateSchema.optional(),
  streamState: StreamStateSchema.optional(),
  metadata: ArtifactMetadataSchema.optional(),
});

export type ChartArtifactData = z.infer<typeof ChartArtifactDataSchema>;
export const ChartArtifactSchema = ChartArtifactDataSchema;
export type ChartArtifactPayload = ChartArtifactData;

export const defaultChartArtifactData: ChartArtifactData = {
  stage: "idle",
  progress: 0,
  chartType: "line",
  timeframe: "30d",
  datasets: [],
  thresholds: [],
  metrics: [],
  panels: [],
  insights: [],
  controls: { filters: [], actions: [] },
  annotations: [],
  streamSummary: {
    eventsProcessed: 0,
  },
  streamState: {
    completed: false,
  },
};

export function createChartArtifactPayload(
  data: Partial<ChartArtifactData> = {},
  overrides: {
    metadata?: ArtifactMetadata;
    streamState?: StreamState;
  } = {}
): ChartArtifactPayload {
  const mergedData: ChartArtifactData = {
    ...defaultChartArtifactData,
    ...data,
  };

  if (mergedData.streamStateOverride) {
    mergedData.streamState = mergedData.streamStateOverride;
    delete (mergedData as Partial<ChartArtifactData>).streamStateOverride;
  }

  if (overrides.metadata) {
    mergedData.metadata = overrides.metadata;
  }

  if (overrides.streamState) {
    mergedData.streamState = overrides.streamState;
  }

  return mergedData;
}

export const ChartArtifact = artifact<ChartArtifactData>(
  "chart-artifact",
  ChartArtifactSchema,
);

export interface ChartArtifactUpdateOptions {
  metadata?: ArtifactMetadata;
  streamState?: StreamState;
  progress?: number;
  error?: ErrorPayload;
}
