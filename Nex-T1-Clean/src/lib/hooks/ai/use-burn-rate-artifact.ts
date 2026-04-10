"use client";

import { toast } from "sonner";
import { useArtifactRegistryArtifact } from "@/lib/ai/artifact-runtime";
import { BurnRateArtifact, type BurnRateArtifactData } from "@/lib/burn-rate";

export function useBurnRateArtifact() {
  const burnRateData = useArtifactRegistryArtifact<BurnRateArtifactData>(
    BurnRateArtifact,
    {
      onStatusChange: (newStatus, oldStatus) => {
        if (newStatus === "loading" && oldStatus === "idle") {
          toast.loading("Starting burn rate analysis...", {
            id: "burn-rate-analysis",
          });
        } else if (newStatus === "complete" && oldStatus === "streaming") {
          const payload = (burnRateData?.data as BurnRateArtifactData | null) ?? null;
          if (!payload) {
            return;
          }
          const panels = payload.panels ?? [];
          const alertPanel = panels.find((panel) => panel.id === "alertCenter");
          const alerts = alertPanel?.insights.length ?? 0;
          const recommendations =
            (payload.insights ?? []).filter((insight) => insight.severity !== "critical").length ?? 0;
          toast.success(
            `Analysis complete! Found ${alerts} alerts and ${recommendations} recommendations.`,
            { id: "burn-rate-analysis" }
          );
        }
      },
      onUpdate: (newData: BurnRateArtifactData, oldData: BurnRateArtifactData | null) => {
        const nextStage = newData?.stage;
        const prevStage = oldData?.stage;

        if (!nextStage) {
          return;
        }

        if (nextStage === "streaming" && prevStage === "loading") {
          toast.loading("Processing financial data...", {
            id: "burn-rate-analysis",
          });
        } else if (nextStage === "analyzing" && prevStage === "streaming") {
          toast.loading("Analyzing trends and generating insights...", {
            id: "burn-rate-analysis",
          });
        }
      },
      onError: (error: string) => {
        toast.error(`Analysis failed: ${String(error)}`, {
          id: "burn-rate-analysis",
        });
      },
    },
  );

  return {
    ...burnRateData,
    data: burnRateData.data as BurnRateArtifactData | null,
  };
}
