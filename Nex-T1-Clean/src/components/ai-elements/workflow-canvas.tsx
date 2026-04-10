"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
import {
  artifactCardClass,
  artifactViewportClass,
} from "@/components/ai-elements/artifact-ui";

export type WorkflowCanvasNode = {
  id: string;
  label: string;
  status?: string;
  details?: string;
  x?: number;
  y?: number;
};

export type WorkflowCanvasEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type WorkflowCanvasProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  nodes: WorkflowCanvasNode[];
  edges?: WorkflowCanvasEdge[];
};

const statusClassMap: Record<string, string> = {
  pending: "border-[var(--artifact-border)] bg-[var(--artifact-shell)]",
  running: "border-[var(--artifact-divider)] bg-[var(--artifact-status-running)]",
  completed: "border-[var(--artifact-divider)] bg-[var(--artifact-status-complete)]",
  done: "border-[var(--artifact-divider)] bg-[var(--artifact-status-complete)]",
  failed: "border-[var(--destructive)]/30 bg-[var(--artifact-status-danger)]",
  error: "border-[var(--destructive)]/30 bg-[var(--artifact-status-danger)]",
};

export function WorkflowCanvas({
  title = "Workflow",
  nodes,
  edges = [],
  className,
  ...props
}: WorkflowCanvasProps) {
  const positions = new Map(
    nodes.map((node, index) => [
      node.id,
      {
        left: node.x ?? 80 + index * 220,
        top: node.y ?? 80 + (index % 2) * 120,
      },
    ]),
  );

  return (
    <div
      className={cn(
        artifactCardClass,
        "relative overflow-hidden bg-[var(--artifact-shell)] p-[var(--artifact-padding)]",
        className,
      )}
      {...props}
    >
      <div className="mb-4 text-xs uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
        {title}
      </div>
      <div className={cn(artifactViewportClass, "relative min-h-[320px] overflow-auto")}>
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          {edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                x1={source.left + 72}
                y1={source.top + 48}
                x2={target.left + 72}
                y2={target.top + 48}
                stroke="var(--artifact-border-strong)"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
            );
          })}
        </svg>
        {nodes.map((node) => {
          const position = positions.get(node.id) ?? { left: 80, top: 80 };
          return (
            <div
              key={node.id}
              className={cn(
                "absolute rounded-[var(--artifact-radius-panel)] border px-4 py-3",
                statusClassMap[node.status ?? "pending"] ?? statusClassMap.pending,
              )}
              style={{
                left: position.left,
                top: position.top,
                width: "var(--artifact-node-width)",
              }}
            >
              <div className="text-sm font-medium text-[var(--artifact-foreground)]">{node.label}</div>
              {node.details ? (
                <div className="mt-2 text-xs text-[var(--artifact-muted)]">{node.details}</div>
              ) : null}
              {node.status ? (
                <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[var(--artifact-muted)]">
                  {node.status}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
