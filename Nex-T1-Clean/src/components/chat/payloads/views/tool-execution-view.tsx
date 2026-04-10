"use client";

import { CodeBlock, CodeBlockCopyButton } from "@/components/dashboard/lazy-components";
import { cn } from "@/lib/utils";

export function GenericToolExecutionView({ 
  toolName, 
  status, 
  input, 
  output, 
  error 
}: { 
  toolName: string; 
  status: string; 
  input: UntypedJson; 
  output: UntypedJson; 
  error?: string; 
}) {
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border/40 bg-background/60 p-4">
      <div className="flex items-center gap-2">
        <div 
          className={cn(
            "size-2 rounded-full",
            status === 'complete' ? "bg-emerald-500" : 
            status === 'error' ? "bg-red-500" : 
            "bg-amber-500 animate-pulse"
          )} 
        />
        <p className="font-semibold text-sm">Tool: {toolName}</p>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Input</p>
        <div className="overflow-hidden rounded-lg border border-border/30 bg-muted/20">
          <CodeBlock 
            code={JSON.stringify(input, null, 2)} 
            language="json" 
            className="text-xs py-2 px-3"
          >
            <CodeBlockCopyButton />
          </CodeBlock>
        </div>
      </div>

      {(output || status === 'complete') && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Output</p>
          <div className="overflow-hidden rounded-lg border border-border/30 bg-muted/20">
            <CodeBlock 
              code={JSON.stringify(output ?? { status: "Done" }, null, 2)} 
              language="json" 
              className="text-xs py-2 px-3"
            >
              <CodeBlockCopyButton />
            </CodeBlock>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}
    </div>
  );
}
