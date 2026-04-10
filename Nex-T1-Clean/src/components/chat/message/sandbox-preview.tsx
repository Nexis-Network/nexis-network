
"use client";

import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface SandboxPreviewProps {
  url: string;
  port?: number;
  isLoading?: boolean;
}

export function SandboxPreview({ url, port = 3000, isLoading = false }: SandboxPreviewProps) {
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0); // Force reload

  const handleRefresh = () => {
    setIsIframeLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="my-4 w-full overflow-hidden rounded-lg border border-[var(--artifact-border)] bg-[var(--artifact-terminal-background)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--artifact-border)] bg-[var(--artifact-preview-chrome)] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-green-500 uppercase tracking-wider">
              Live Preview
            </span>
          </div>
          <span className="font-mono text-xs text-[var(--artifact-muted)]">
            localhost:{port}
          </span>
        </div>
        <div className="flex items-center gap-1">
           {isLoading && (
               <div className="flex items-center gap-1.5 px-2 text-xs text-amber-500">
                 <Loader2 className="h-3 w-3 animate-spin"/>
                 Starting...
               </div>
           )}
          <button
            onClick={handleRefresh}
            className="rounded-md p-1.5 text-[var(--artifact-muted)] transition-colors hover:bg-[var(--artifact-elevated)] hover:text-[var(--artifact-foreground)]"
            title="Reload Preview"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isIframeLoading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-[var(--artifact-muted)] transition-colors hover:bg-[var(--artifact-elevated)] hover:text-[var(--artifact-foreground)]"
            title="Open in New Tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative aspect-video w-full bg-[var(--artifact-preview-canvas)]">
        {isIframeLoading && !isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--artifact-preview-canvas)]">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--artifact-muted)]" />
            </div>
        )}
        
        {url ? (
            <iframe
            key={iframeKey}
            src={url}
            className="h-full w-full border-0 bg-[var(--artifact-preview-canvas)]"
            onLoad={() => setIsIframeLoading(false)}
            onError={() => setIsIframeLoading(false)}
            title={`Sandbox Preview on port ${port}`}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            />
        ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--artifact-preview-chrome)]/80 text-[var(--artifact-muted)]">
                <AlertTriangle className="h-6 w-6 mb-1 opacity-50"/>
                <span className="text-sm">Waiting for preview URL...</span>
            </div>
        )}
      </div>
    </div>
  );
}
