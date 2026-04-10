"use client";

import dynamic from "next/dynamic";

import { AgentOutputCard as AgentOutputCardBase } from "@/components/agents/agent-output-card";
import { withChunkRetry } from "@/components/dashboard/chunk-load-retry";

export * from "./lazy-ai-elements";

const ChartLoadingFallback = () => (
  <div className="flex h-64 items-center justify-center rounded-lg border border-border/40 bg-muted/30">
    <div className="size-6 animate-spin rounded-full border-2 border-border border-t-transparent" />
  </div>
);

const DialogLoadingFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="size-8 animate-spin rounded-full border-2 border-border border-t-transparent" />
  </div>
);

const PulseBlock = ({ height }: { height: number }) => (
  <div className="w-full animate-pulse rounded bg-muted/60" style={{ height }} />
);

const pythChartModule = withChunkRetry(() => import("@/components/analytics/pyth-chart"));

export const PythChart = dynamic(
  () =>
    pythChartModule().then((mod) => ({
      default: mod.PythChart,
    })),
  {
    ssr: false,
    loading: () => <ChartLoadingFallback />,
  },
);

const burnRateChartModule = withChunkRetry(() => import("@/components/analytics/burn-rate-chart"));

export const BurnRateChart = dynamic(
  () =>
    burnRateChartModule().then((mod) => ({
      default: mod.BurnRateChart,
    })),
  {
    ssr: false,
    loading: () => <DialogLoadingFallback />,
  },
);

const taskResultVisualizerModule = withChunkRetry(() => import("@/components/tasks/task-result-visualizer"));

export const TaskResultVisualizer = dynamic(
  () =>
    taskResultVisualizerModule().then((mod) => ({
      default: mod.TaskResultVisualizer,
    })),
  {
    ssr: false,
    loading: () => <PulseBlock height={128} />,
  },
);

const chainVisualizationModule = withChunkRetry(() => import("@/components/tasks/task-result"));

export const ChainVisualization = dynamic(
  () =>
    chainVisualizationModule().then((mod) => ({
      default: mod.ChainVisualization,
    })),
  {
    ssr: false,
    loading: () => <PulseBlock height={96} />,
  },
);

const dashboardSidebarModule = withChunkRetry(() => import("@/components/sidebar/app-sidebar"));

export const DashboardSidebar = dynamic(
  () =>
    dashboardSidebarModule().then((mod) => ({
      default: mod.DashboardSidebar,
    })),
  { ssr: true },
);

const sourcesListModule = withChunkRetry(() => import("@/components/chat/sources-list"));

export const SourcesList = dynamic(
  () =>
    sourcesListModule().then((mod) => ({
      default: mod.SourcesList,
    })),
  { ssr: false },
);

// AgentOutputCard is small and used frequently; import eagerly to avoid chunk load flakiness.
export const AgentOutputCard = AgentOutputCardBase;
