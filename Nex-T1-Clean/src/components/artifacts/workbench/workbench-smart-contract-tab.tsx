"use client";

import { Braces, FileCode2 } from "lucide-react";

import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SmartContractFile = {
  path: string;
  content: string;
  language: string;
};

type WorkbenchSmartContractTabProps = {
  loading?: boolean;
  contracts: SmartContractFile[];
  activePath: string | null;
  framework?: string | null;
  chain?: string | null;
  commands?: string[];
  onSelectPath: (path: string) => void;
};

export function WorkbenchSmartContractTab({
  loading = false,
  contracts,
  activePath,
  framework,
  chain,
  commands = [],
  onSelectPath,
}: WorkbenchSmartContractTabProps) {
  if (loading && contracts.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
        Waiting for Solidity or Solana program files. Ask the agent to open/write a <code>.sol</code> or <code>.rs</code> file.
      </div>
    );
  }

  const selectedPath = activePath && contracts.some((file) => file.path === activePath)
    ? activePath
    : contracts[0].path;

  const selected = contracts.find((file) => file.path === selectedPath) ?? contracts[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300">
          <Braces className="mr-1 size-3" />
          Smart Contracts
        </Badge>
        {chain ? <Badge variant="outline">{chain}</Badge> : null}
        {framework ? <Badge variant="outline">{framework}</Badge> : null}
        {commands.length > 0 ? <Badge variant="outline">{commands.length} commands</Badge> : null}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr] gap-2 overflow-hidden">
        <div className="overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-1">
          {contracts.map((file) => (
            <button
              key={file.path}
              type="button"
              onClick={() => onSelectPath(file.path)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                file.path === selectedPath
                  ? "bg-accent/40 text-foreground"
                  : "text-muted-foreground hover:bg-accent/25 hover:text-foreground",
              )}
            >
              <FileCode2 className="size-3.5 shrink-0" />
              <span className="truncate">{file.path}</span>
            </button>
          ))}
        </div>

        <CodeBlock code={selected.content} language={selected.language} className="h-full rounded-xl">
          <CodeBlockCopyButton />
        </CodeBlock>
      </div>

      {commands.length > 0 ? (
        <div className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs">
          <p className="mb-2 font-medium text-foreground">Suggested commands</p>
          <div className="space-y-1 text-muted-foreground">
            {commands.slice(0, 4).map((command) => (
              <code key={command} className="block truncate">
                {command}
              </code>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
