"use client";

import { useMemo } from "react";
import {
  AIResponse,
  ChainVisualization,
  CodeBlock,
  CodeBlockCopyButton,
  TaskResultVisualizer,
} from "@/components/dashboard/lazy-components";
import type {
  AnalysisPayload,
  ParallelProcessingResult,
} from "@/components/chat/types";
import type { ChainTaskResult } from "@/app/chain";

export const createChainResultFromAnalysis = (
  topic: string,
  data: ParallelProcessingResult,
): ChainTaskResult => {
  const baseTime = Date.now() / 1000;

  const stories = data.results.map((item: { task: string; result: string }, index: number) => {
    const score = Math.max(60, 95 - index * 10);
    const commentCount = 8 + index * 4;
    const age = index * 2;

    return {
      story: {
        id: index + 1,
        title: `${item.task} perspective`,
        url: "",
        score,
        by: "Nex Analyst",
        time: baseTime - age * 3600,
        descendants: commentCount,
      },
      stats: {
        score,
        commentCount,
        age,
      },
      topComments: [],
      summary: {
        popularity: (score >= 90 ? "high" : score >= 75 ? "medium" : "low") as "high" | "medium" | "low",
        engagement: (commentCount >= 20 ? "high" : commentCount >= 12 ? "medium" : "low") as
          | "high"
          | "medium"
          | "low",
        ageCategory: (age < 12 ? "new" : age < 48 ? "recent" : "old") as "new" | "recent" | "old",
      },
    };
  });

  const avgScore =
    stories.reduce((total: number, story: typeof stories[0]) => total + story.stats.score, 0) / Math.max(stories.length, 1);

  const avgComments =
    stories.reduce((total: number, story: typeof stories[0]) => total + story.stats.commentCount, 0) / Math.max(stories.length, 1);

  return {
    topic,
    stories,
    topicSummary: {
      totalStories: stories.length,
      avgScore: Math.round(avgScore),
      avgComments: Math.round(avgComments),
      trending: stories.some((story) => story.summary.popularity === "high"),
    },
  };
};

export function AnalysisResultView({ payload }: { payload: AnalysisPayload }) {
  const chainData = useMemo(
    () => createChainResultFromAnalysis(payload.topic, payload.data),
    [payload.topic, payload.data],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-muted/10 p-5 backbackdrop-blur-lg no-scrollbar transition-all hover:bg-muted/15">
      <TaskResultVisualizer data={chainData} />
      <ChainVisualization data={chainData} />
      <div className="space-y-3">
        {payload.data.results.map((result: { task: string; result: string }) => (
          <div
            key={result.task}
            className="group/item space-y-2 rounded-xl border border-border/30 bg-background/40 p-4 shadow-sm backdrop-blur-md no-scrollbar transition-all hover:border-border/60 hover:bg-background/60"
          >
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-primary/60 group-hover/item:bg-primary transition-colors" />
              <p className="font-semibold text-sm tracking-tight">{result.task}</p>
            </div>
            <AIResponse className="text-sm leading-relaxed text-muted-foreground group-hover/item:text-foreground transition-colors">
              {result.result}
            </AIResponse>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-border/30 bg-muted/50 dark:bg-black/20">
        <CodeBlock
          code={JSON.stringify(
            { metadata: payload.data.metadata, usage: payload.data.usage },
            null,
            2,
          )}
          language="json"
        >
          <CodeBlockCopyButton />
        </CodeBlock>
      </div>
    </div>
  );
}
