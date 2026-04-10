"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CopyIcon, TerminalIcon, Trash2Icon } from "lucide-react";
import {
  artifactGhostControlClass,
  artifactInsetPanelClass,
} from "@/components/ai-elements/artifact-ui";

type TerminalContextType = {
  output: string;
  isStreaming?: boolean;
  autoScroll?: boolean;
  onClear?: () => void;
};

const TerminalContext = React.createContext<TerminalContextType>({
  output: "",
});

export type TerminalProps = React.HTMLAttributes<HTMLDivElement> & {
  output: string;
  isStreaming?: boolean;
  autoScroll?: boolean;
  onClear?: () => void;
};

export const Terminal = ({
  className,
  output,
  isStreaming,
  autoScroll,
  onClear,
  children,
  ...props
}: TerminalProps) => (
  <TerminalContext.Provider value={{ output, isStreaming, autoScroll, onClear }}>
    <div
      className={cn(
        artifactInsetPanelClass,
        "flex min-h-[var(--artifact-terminal-min-height)] w-full flex-col overflow-hidden bg-[var(--artifact-terminal-background)] text-[var(--artifact-terminal-foreground)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  </TerminalContext.Provider>
);

export const TerminalHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex h-[var(--artifact-toolbar-height)] items-center justify-between border-b border-[var(--artifact-border)] bg-[var(--artifact-toolbar)] px-3",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const TerminalTitle = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2", className)} {...props} >
    <TerminalIcon className="size-4 text-[var(--artifact-terminal-muted)]" />
    <span className="text-sm font-medium text-[var(--artifact-terminal-foreground)]">{children ?? "Terminal"}</span>
  </div>
);

export const TerminalStatus = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { isStreaming } = React.useContext(TerminalContext);
  
  if (!isStreaming) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)} {...props} >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--artifact-status-running)] opacity-75"></span>
        <span className="relative inline-flex size-2 rounded-full bg-[var(--artifact-control-foreground)]"></span>
      </span>
      <span className="text-xs text-[var(--artifact-terminal-muted)]">Running</span>
    </div>
  );
};

export const TerminalActions = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-1", className)} {...props} >
    {children}
  </div>
);

export const TerminalCopyButton = ({
  onCopy,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { onCopy?: () => void }) => {
  const { output } = React.useContext(TerminalContext);
  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    onCopy?.();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        artifactGhostControlClass,
        "size-8 border-transparent text-[var(--artifact-terminal-muted)] hover:text-[var(--artifact-terminal-foreground)]",
        className,
      )}
      onClick={handleCopy}
      {...props}
    >
      <CopyIcon className="size-3.5" />
      <span className="sr-only">Copy output</span>
    </Button>
  );
};

export const TerminalClearButton = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => {
  const { onClear } = React.useContext(TerminalContext);
  return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          artifactGhostControlClass,
          "size-8 border-transparent text-[var(--artifact-terminal-muted)] hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-terminal-foreground)]",
          className,
        )}
        onClick={onClear}
        {...props}
      >
        <Trash2Icon className="size-3.5" />
        <span className="sr-only">Clear terminal</span>
      </Button>
  );
};

export const TerminalContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { output, autoScroll } = React.useContext(TerminalContext);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [output, autoScroll]);

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto p-4 font-mono text-xs leading-normal",
        className
      )}
      {...props}
    >
      <div className="whitespace-pre-wrap text-[var(--artifact-terminal-foreground)]">{output}</div>
      <div ref={bottomRef} />
    </div>
  );
};
