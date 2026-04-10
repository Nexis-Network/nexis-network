"use client";

import { Code, Download, Eye } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createHighlighter } from "shiki";
import { CopyButton } from "@/components/shared/copy/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentCodePreviewProps {
  agentType: string;
  code: string;
  className?: string;
}

export function AgentCodePreview({
  agentType,
  code,
  className,
}: AgentCodePreviewProps) {
  const agentDisplayName = agentType
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const downloadCode = () => {
    const blob = new Blob([code], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agentType}-agent.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            className={cn("gap-2", className)}
            size="sm"
            variant="outline"
          >
            <Eye className="h-3 w-3" />
            Preview Code
          </Button>
        </DialogTrigger>
        <DialogContent className="flex h-[90vh] w-[95vw] max-w-4xl flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              {agentDisplayName} Agent Code
            </DialogTitle>
            <DialogDescription>
              Complete TypeScript implementation with all dependencies and
              imports
            </DialogDescription>
            {/* Action Buttons */}
            <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-0">
              <div className="text-muted-foreground text-sm">
                {code.split("\n").length} lines • {code.length} characters
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  onClick={downloadCode}
                  size="sm"
                  variant="outline"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
                <CopyButton size="sm" text={code} />
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            <div className="h-full w-full rounded-lg border bg-muted/30">
              <ScrollArea className="h-full">
                {/* Code Preview */}
                <div className="relative w-full p-4">
                  <CodePreview className={className} code={code} />
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CodePreviewProps {
  code: string;
  className?: string;
}

let highlighterPromise: Promise<Awaited<ReturnType<typeof createHighlighter>>>;

async function getShikiHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["typescript"],
    });
  }
  return highlighterPromise;
}

function CodePreview({ code, className }: CodePreviewProps) {
  const [html, setHtml] = useState("");
  const { theme } = useTheme();

  useEffect(() => {
    getShikiHighlighter().then((highlighter) => {
      const highlighted = highlighter.codeToHtml(code, {
        lang: "typescript",
        theme: theme === "dark" ? "github-dark" : "github-light",
      });

      // Replace background color and add padding styles
      const processedHtml = highlighted
        .replace(/style="[^"]*?background-color:[^"]*?"/, "")
        .replace(
          '<pre class="',
          '<pre style="background: transparent;" class="'
        );

      setHtml(processedHtml);
    });
  }, [code, theme]);

  return (
    <div
      className={cn("w-full overflow-x-auto text-xs", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
