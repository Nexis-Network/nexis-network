"use client";

import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { SourceIcon } from "@/components/sources/source-icon";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/schema";

interface SourcesListProps {
  sources: Source[];
}

export function SourcesList({ sources }: SourcesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show only 2 sources when collapsed
  const visibleSources = isExpanded ? sources : sources.slice(0, 2);
  const hasMoreSources = sources.length > 2;

  return (
    <div className="space-y-3">
      <div className="">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
            Sources
          </h3>
          {hasMoreSources && (
            <button
              className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>Show all ({sources.length})</span>
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        <ul className="space-y-3">
          {visibleSources.map((source, index) => (
            <SourceItem
              isLast={index === visibleSources.length - 1}
              key={index}
              source={source}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

interface SourceItemProps {
  source: Source;
  isLast: boolean;
}

function SourceItem({ source, isLast }: SourceItemProps) {
  return (
    <li className={cn("pb-3 text-xs", !isLast && "border-border/20 border-b")}>
      <a
        className="flex items-start gap-2 text-muted-foreground transition-colors duration-200 hover:text-foreground"
        href={source.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <SourceIcon title={source.title} url={source.url} className="mt-0.5" size={14} />
        <div>
          <div className="line-clamp-1 font-medium">{source.title}</div>
          {source.snippet && (
            <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/70">
              {source.snippet}
            </p>
          )}
        </div>
        <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-70" />
      </a>
    </li>
  );
}
