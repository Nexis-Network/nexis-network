"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
} from "@/components/ai-elements/artifact";
import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-muted/40",
        className,
      )}
    />
  );
}

export function MarketListSkeleton() {
  return (
    <Artifact className="space-y-0">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <Bone className="size-4 rounded-full" />
          <ArtifactTitle>Loading markets...</ArtifactTitle>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/40 p-4 space-y-3">
            <Bone className="h-4 w-3/4" />
            <Bone className="h-6 w-full rounded-md" />
            <div className="flex gap-4">
              <Bone className="h-3 w-16" />
              <Bone className="h-3 w-16" />
              <Bone className="h-3 w-20 ml-auto" />
            </div>
          </div>
        ))}
      </ArtifactContent>
    </Artifact>
  );
}

export function OrderbookSkeleton() {
  return (
    <Artifact className="space-y-0">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <Bone className="size-4 rounded-full" />
          <ArtifactTitle>Loading orderbook...</ArtifactTitle>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="space-y-4">
        <Bone className="h-4 w-2/3" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Bone key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Bone className="h-3 w-12 mb-2" />
              {Array.from({ length: 5 }).map((_, j) => (
                <Bone key={j} className="h-6 w-full" />
              ))}
            </div>
          ))}
        </div>
      </ArtifactContent>
    </Artifact>
  );
}

export function PositionsSkeleton() {
  return (
    <Artifact className="space-y-0">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <Bone className="size-4 rounded-full" />
          <ArtifactTitle>Loading positions...</ArtifactTitle>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Bone className="h-20 rounded-xl" />
          <Bone className="h-20 rounded-xl" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Bone key={i} className="h-16 rounded-lg" />
        ))}
      </ArtifactContent>
    </Artifact>
  );
}

export function BridgeSkeleton() {
  return (
    <Artifact className="space-y-0">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <Bone className="size-4 rounded-full" />
          <ArtifactTitle>Loading bridge status...</ArtifactTitle>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="space-y-4">
        <Bone className="h-14 rounded-lg" />
        <Bone className="h-24 rounded-lg" />
      </ArtifactContent>
    </Artifact>
  );
}

export { Bone };
