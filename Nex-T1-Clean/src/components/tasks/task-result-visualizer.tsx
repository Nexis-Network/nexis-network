"use client";

import { ArrowRight, BarChart2, Database, Search, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { ChainTaskResult } from "@/app/chain";
import { HackerNewsLogo } from "./brand-logos";

export interface TaskResultVisualizerProps {
  data: ChainTaskResult;
  isLoading?: boolean;
}

interface PipelineStage {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "completed" | "processing" | "pending";
}

export function TaskResultVisualizer({ data, isLoading }: TaskResultVisualizerProps) {
  // Define the pipeline stages
  const stages: PipelineStage[] = [
    {
      id: "search",
      title: "Search",
      description: "Finding relevant stories",
      icon: Search,
      status: data?.stories
        ? "completed"
        : isLoading
          ? "processing"
          : "pending",
    },
    {
      id: "fetch",
      title: "Results",
      description: "Loading story details ",
      icon: Database,
      status: data?.stories?.length
        ? "completed"
        : data?.stories
          ? "processing"
          : "pending",
    },
    {
      id: "analyze",
      title: "Analysis",
      description: "Processing  metrics",
      icon: BarChart2,
      status: data?.topicSummary
        ? "completed"
        : data?.stories?.length
          ? "processing"
          : "pending",
    },
    {
      id: "summarize",
      title: "Summary",
      description: "Generating topic insights",
      icon: Zap,
      status:
        data?.topicSummary?.trending !== undefined
          ? "completed"
          : data?.topicSummary
            ? "processing"
            : "pending",
    },
  ];

  if (isLoading) {
    return (
      <Card className="space-y-4 p-4">
        <h3 className="font-medium text-xs">Processing Pipeline</h3>
        <div className="grid grid-cols-4 gap-2">
          {stages.map((stage, index) => (
            <div className="flex items-center" key={stage.id}>
              <div className="flex-1 space-y-2">
                <div className="h-8 animate-pulse rounded-md bg-muted/50" />
                <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted/30" />
              </div>
              {index < stages.length - 1 && (
                <ArrowRight className="mx-2 h-3 w-3 text-muted-foreground/30" />
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 border-none p-4 shadow-none">
      <HackerNewsLogo size="lg" withText />

      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage, index) => (
          <div className="flex items-center" key={stage.id}>
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex-1"
              initial={{ opacity: 0, y: 10 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={`rounded-md p-1 ${
                    stage.status === "completed"
                      ? "bg-green-500/10 text-green-500"
                      : stage.status === "processing"
                        ? "bg-sky-500/100/10 text-blue-500"
                        : "bg-muted/10 text-muted-foreground"
                  }`}
                >
                  <stage.icon className="h-3 w-3" />
                </div>
                <div>
                  <p className="font-medium text-xs">{stage.title}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
              </div>
            </motion.div>
            {index < stages.length - 1 && (
              <ArrowRight className="mr-1 h-2 w-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

