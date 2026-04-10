"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut, RefreshCcw } from "lucide-react";

import { logger } from '@/lib/logger';
// Initialize mermaid state helper
let mermaidInitialized = false;

const initMermaid = async () => {
  if (mermaidInitialized) return;
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
  mermaidInitialized = true;
};

interface CanvasArtifactProps {
  code: string;
  language?: string; // usually 'mermaid'
  title?: string;
  active_tab?: string;
}

export function CanvasArtifact({ code, language = "mermaid" }: CanvasArtifactProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isRendered, setIsRendered] = useState(false);

  // If it's not mermaid, we can't render it yet with this component
  const isMermaid = language === "mermaid" || language === "graph";

  useEffect(() => {
    if (!isMermaid || !code) return;

    let mounted = true;
    const renderDiagram = async () => {
      try {
        setError(null);
        await initMermaid();
        const mermaid = (await import("mermaid")).default;
        
        // Unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // mermaid.render returns an object { svg, bindFunctions }
        const { svg: svgContent } = await mermaid.render(id, code);
        
        if (mounted) {
          setSvg(svgContent);
          setIsRendered(true);
        }
      } catch (err) {
        if (mounted) {
          logger.error("Mermaid render error:", err);
          setError("Failed to render diagram. Syntax might be incorrect.");
          setIsRendered(true); // Stop loading state even if error
        }
      }
    };

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [code, isMermaid]);

  if (!isMermaid) {
    return (
      <div className="p-4 rounded-lg border border-border/40 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Canvas preview not available for language: <span className="font-mono text-foreground">{language}</span>
        </p>
        <pre className="mt-2 text-xs overflow-x-auto p-2 bg-background rounded border border-border/20">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[300px] rounded-lg border border-border/40 bg-background/60 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Canvas / Mermaid</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="text-[10px] w-8 text-center text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="w-px h-3 bg-border/50 mx-1" />
          <button
            onClick={() => setScale(1)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Reset Zoom"
          >
            <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto relative bg-[url('/bg/dot-grid.svg')] bg-repeat bg-center p-4">
        {!isRendered ? (
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="flex flex-col items-center gap-2">
               <Loader2 className="h-5 w-5 animate-spin text-primary" />
               <span className="text-xs text-muted-foreground">Rendering diagram...</span>
             </div>
           </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-destructive text-sm font-medium mb-2">Rendering Failed</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <pre className="text-[10px] text-left w-full max-w-md bg-muted/50 p-2 rounded overflow-x-auto border border-border/20">
              {code}
            </pre>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="flex items-center justify-center min-h-full transition-transform duration-200 origin-center"
            style={{ transform: `scale(${scale})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>
  );
}
