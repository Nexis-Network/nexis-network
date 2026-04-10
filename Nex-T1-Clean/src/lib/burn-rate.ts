import { artifact, type ArtifactData } from "@/lib/ai/artifact-kit";
import { z } from "zod";

import {
  ChartArtifact,
  ChartArtifactData,
  ChartArtifactSchema,
  createChartArtifactPayload,
} from "@/modules/ai/artifacts/chart";

const BurnRateDataSchema = ChartArtifactSchema;

export type BurnRateArtifactData = z.infer<typeof BurnRateDataSchema>;
export type BurnRateArtifactPayload = BurnRateArtifactData;
export type BurnRateArtifactInstance = ArtifactData<BurnRateArtifactData>;

/**
 * Burn rate specific artifact built on top of the generic chart artifact schema.
 * Exposed separately so the orchestrator can call the burnRate tool while still sharing logic with other chart artifacts.
 */
export const BurnRateArtifact = artifact<BurnRateArtifactData>(
  "burn-rate-chart",
  BurnRateDataSchema,
);

const defaultPanels: ChartArtifactData["panels"] = [
  {
    id: "cashFlow",
    title: "Cash Flow Breakdown",
    description: "Month-over-month burn rate movement with notable variances.",
    metrics: [],
    insights: [],
    expanded: true,
  },
  {
    id: "alertCenter",
    title: "Alerts & Recommendations",
    description: "Automated flags generated from anomalous spend behaviour.",
    metrics: [],
    insights: [],
    expanded: true,
  },
];

const defaultInsights: ChartArtifactData["insights"] = [
  {
    id: "sustained-decline",
    title: "Improved Burn Efficiency",
    description: "Burn rate decreased by 12% over the last 30 days while revenue grew 8%.",
    severity: "success",
    tags: ["trend", "efficiency"],
    relatedDatasetIds: ["burnRate"],
  },
];

const defaultMetrics: ChartArtifactData["metrics"] = [
  {
    id: "current-burn",
    label: "Current Burn",
    value: 85000,
    formattedValue: "$85K",
    deltaPercentage: -5.4,
    trend: "down",
  },
  {
    id: "cash-runway",
    label: "Runway",
    value: 9.4,
    formattedValue: "9.4 months",
    trend: "up",
  },
  {
    id: "monthly-revenue",
    label: "Monthly Revenue",
    value: 125000,
    formattedValue: "$125K",
    deltaPercentage: 7.2,
    trend: "up",
  },
];

const defaultDatasets: ChartArtifactData["datasets"] = [
  {
    id: "revenue",
    label: "Revenue",
    type: "line",
    axis: "primary",
    color: "hsl(var(--chart-2))",
    values: [],
  },
  {
    id: "expenses",
    label: "Expenses",
    type: "line",
    axis: "primary",
    color: "hsl(var(--chart-4))",
    values: [],
  },
  {
    id: "burnRate",
    label: "Burn Rate",
    type: "area",
    axis: "primary",
    color: "hsl(var(--chart-1))",
    values: [],
  },
];

function generateArtifactId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `artifact-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createInitialBurnRateArtifact(
  overrides: Partial<ChartArtifactData> = {}
): BurnRateArtifactInstance {
  const { metadata, streamState, ...rest } = overrides;

  const payload = createChartArtifactPayload(
    {
      stage: "loading",
      progress: 0.1,
      chartType: "mixed",
      timeframe: "90d",
      datasets: defaultDatasets,
      panels: defaultPanels,
      insights: defaultInsights,
      metrics: defaultMetrics,
      controls: {
        filters: [
          {
            id: "timeframe",
            label: "Timeframe",
            type: "select",
            value: "90d",
            options: [
              { value: "30d", label: "30 days" },
              { value: "60d", label: "60 days" },
              { value: "90d", label: "90 days" },
            ],
          },
        ],
        actions: [
          {
            id: "export",
            label: "Export CSV",
            variant: "secondary",
          },
          {
            id: "toggle-benchmark",
            label: "Toggle Benchmarks",
            variant: "ghost",
          },
        ],
      },
      annotations: [],
      streamSummary: {
        eventsProcessed: 0,
      },
      ...rest,
    },
    {
      metadata: metadata ?? {
        title: "Burn Rate Analysis",
        summary: "Streaming burn rate analysis with AI recommendations and live metrics.",
      },
      streamState,
    }
  );

  const now = Date.now();

  return {
    id: generateArtifactId(),
    type: BurnRateArtifact.id,
    status: payload.stage === "complete" ? "complete" : "loading",
    payload,
    version: 1,
    progress: payload.progress,
    createdAt: now,
    updatedAt: now,
  };
}

export function mapBurnRateSeriesFromMonthlyData(data: Array<{
  month: string;
  revenue: number;
  expenses: number;
  burnRate: number;
}>): ChartArtifactData["datasets"] {
  const toPoint = (value: number, month: string) => ({
    x: month,
    y: value,
  });

  return defaultDatasets.map((dataset) => {
    if (dataset.id === "revenue") {
      return {
        ...dataset,
        values: data.map((item) => ({
          ...toPoint(item.revenue, item.month),
        })),
      };
    }
    if (dataset.id === "expenses") {
      return {
        ...dataset,
        values: data.map((item) => ({
          ...toPoint(item.expenses, item.month),
        })),
      };
    }
    if (dataset.id === "burnRate") {
      return {
        ...dataset,
        values: data.map((item) => ({
          ...toPoint(item.burnRate, item.month),
        })),
      };
    }
    return dataset;
  });
}

export { ChartArtifact };
