"use client";

import { motion } from "motion/react";

import { MarkdownRenderer } from "@/components/shared/markdown/markdown";
import { SourcesList } from "@/components/chat/sources-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchResult } from "@/server/actions";

export interface SearchResultsProps {
  query: string;
  result: SearchResult | null;
  loading: boolean;
  error: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function SearchResults({
  query,
  result,
  loading,
  error,
}: SearchResultsProps) {
  if (!(query || loading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-xs">
          Enter a search query to get started
        </p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-100/50 bg-red-50/30 p-4">
        <p className="text-red-500 text-xs">{error}</p>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="rounded-md border border-red-100/50 bg-red-50/30 p-4">
        <p className="text-red-500 text-xs">{result.error.message}</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <motion.div
      animate="visible"
      className="space-y-10"
      initial="hidden"
      variants={containerVariants}
    >
      <motion.div className="space-y-2" variants={itemVariants}>
        <motion.div
          className="text-muted-foreground text-xs"
          variants={itemVariants}
        >
          Search Results for{" "}
          <span className="font-bold">&ldquo;{query}&rdquo;</span>
        </motion.div>

        <motion.div
          className="space-y-6 rounded-md bg-card p-4 "
          variants={itemVariants}
        >
          <MarkdownRenderer content={result.text} />
        </motion.div>

        <motion.div
          className="flex flex-col gap-2 rounded-md bg-card p-4 border border-border/50"
          variants={itemVariants}
        >
          {result.sources && result.sources.length > 0 && (
            <SourcesList sources={result.sources} />
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <motion.div
      animate="visible"
      className="space-y-10"
      initial="hidden"
      variants={containerVariants}
    >
      <motion.div className="space-y-1" variants={itemVariants}>
        <div className="pb-2 text-muted-foreground/50 text-xs">
          <Skeleton className="inline-block h-3 w-32" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
          <div className="py-1" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-full" />
          <div className="py-1" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </motion.div>

      <motion.div
        className="space-y-4 border-border/40 border-t pt-4"
        variants={itemVariants}
      >
        <Skeleton className="h-2.5 w-16" />
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="mt-0.5 h-3 w-3" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-2/3" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="mt-0.5 h-3 w-3" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-2/3" />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
