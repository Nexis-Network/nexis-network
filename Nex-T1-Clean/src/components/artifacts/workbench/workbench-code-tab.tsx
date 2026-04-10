"use client";

import { artifactEmptyStateClass } from "@/components/ai-elements/artifact-ui";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type WorkbenchCodeTabProps = {
  loading?: boolean;
  hasCode: boolean;
  code: string;
  language: string;
};

export function WorkbenchCodeTab({
  loading = false,
  hasCode,
  code,
  language,
}: WorkbenchCodeTabProps) {
  if (loading && !hasCode) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[var(--artifact-terminal-min-height)] w-full" />
      </div>
    );
  }

  if (!hasCode) {
    return (
      <div className={cn(artifactEmptyStateClass, "min-h-[var(--artifact-terminal-min-height)]")}>
        Waiting for code stream from the agent.
      </div>
    );
  }

  return (
    <CodeBlock
      data-testid="artifact-code-view"
      code={code}
      language={language}
      className="h-full"
    >
      <CodeBlockCopyButton />
    </CodeBlock>
  );
}
