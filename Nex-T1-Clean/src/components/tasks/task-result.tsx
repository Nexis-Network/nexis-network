"use client";

import {
  Clock,
  ExternalLink,
  Hash,
  MessageSquare,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import type { ChainTaskResult } from "@/app/chain";

import { TaskResultVisualizer } from "./task-result-visualizer";

interface ChainVisualizationProps {
  data: ChainTaskResult;
  isLoading?: boolean;
}

export function ChainVisualization({
  data,
  isLoading,
}: ChainVisualizationProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <TaskResultVisualizer data={data} isLoading={isLoading} />
        <div className="h-[52px] animate-pulse rounded-md border border-border/50 bg-background/50 p-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="ml-auto h-4 w-16 rounded bg-muted" />
          </div>
        </div>

        <div className="divide-y divide-border/50 rounded-md border border-border/50 bg-background/50">
          {[1, 2, 3].map((i) => (
            <div className="animate-pulse space-y-2 p-3" key={i}>
              <div className="h-3 w-2/3 rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-2 w-12 rounded bg-muted" />
                <div className="h-2 w-12 rounded bg-muted" />
                <div className="h-2 w-16 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!(data && data.stories) || (data.stories.length === 0 && isLoading)) {
    return (
      <div className="space-y-4">
        <TaskResultVisualizer data={data} isLoading={isLoading} />
        <div className="flex h-[52px] items-center justify-center rounded-md border border-border/50 bg-background/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-3 w-3" />
            <span className="text-xs">Searching for stories...</span>
          </div>
        </div>
      </div>
    );
  }

  const { topic, stories, topicSummary } = data;

  return (
    <div className="space-y-4">
      <TaskResultVisualizer data={data} isLoading={isLoading} />

      <motion.div
        animate={{ opacity: 1 }}
        className="rounded-md border border-border/50 bg-background/50 p-3"
        initial={{ opacity: 0 }}
      >
        <div className="flex items-center gap-2">
          <Hash className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs">{topic}</span>
          {topicSummary?.trending && (
            <Badge className="ml-auto h-4 px-1" variant="default">
              <TrendingUp className="mr-1 h-2 w-2" />
              <span className="text-[10px]">Trending</span>
            </Badge>
          )}
        </div>
      </motion.div>

      <div className="divide-y divide-border/50 rounded-md border border-border/50 bg-background/50">
        <AnimatePresence mode="popLayout">
          {stories.map(({ story, stats, summary }, index) => (
            <motion.div
              animate={{ opacity: 1 }}
              className="group p-3"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={story.id}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <p className="truncate text-xs">{story.title}</p>
                    {story.url && (
                      <a
                        className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                        href={story.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-2.5 w-2.5" />
                      {stats.score}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {stats.commentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {Math.round(stats.age)}h
                    </span>
                    <span>by {story.by}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex flex-col items-center gap-1 p-1 ">
                    <label className="text-[7px] text-muted-foreground">
                      popularity
                    </label>
                    <Badge
                      className="h-4 px-1"
                      variant={
                        summary.popularity === "high" ? "default" : "secondary"
                      }
                    >
                      <span className="text-[8px]">{summary.popularity}</span>
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-1 ">
                    <label className="text-[7px] text-muted-foreground">
                      engagement
                    </label>
                    <Badge
                      className="h-4 px-1"
                      variant={
                        summary.engagement === "high" ? "default" : "secondary"
                      }
                    >
                      <span className="text-[8px]">{summary.engagement}</span>
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
