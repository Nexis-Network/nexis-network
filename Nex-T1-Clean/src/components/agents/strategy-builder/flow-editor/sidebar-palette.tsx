"use client";

import { Bot, MousePointer2, Scissors, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const DRAGGABLE_NODES = [
  {
    type: "strategy_tool",
    label: "Dispatch Tool",
    icon: Bot,
    description: "Use an MCP or AI tool",
    color: "text-indigo-400",
  },
  {
    type: "strategy_logic",
    label: "Logic Branch",
    icon: Workflow,
    description: "If/Else condition",
    color: "text-amber-400",
  },
  {
    type: "strategy_end",
    label: "End Workflow",
    icon: Scissors,
    description: "Terminate the process",
    color: "text-muted-foreground",
  },
];

export function SidebarPalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow/type", nodeType);
    event.dataTransfer.setData("application/reactflow/label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-xl border border-[var(--settings-border)] bg-[color-mix(in_oklab,var(--settings-panel)_90%,transparent)] p-2 shadow-xl backdrop-blur-md w-14 hover:w-64 hover:p-4 transition-all duration-300 group overflow-hidden">
        <div className="flex items-center gap-3 px-2 mb-2 group-hover:mb-4">
            <MousePointer2 className="h-5 w-5 text-[var(--settings-foreground-subtle)] shrink-0" />
            <span className="text-sm font-medium text-[var(--settings-foreground-strong)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Node Palette</span>
        </div>

      <div className="flex flex-col gap-2">
        {/* Start (Not draggable usually, present by default, but maybe allowed multiple?) */}
        {DRAGGABLE_NODES.map((node) => (
          <div
            key={node.type}
            className="flex cursor-grab items-center gap-3 rounded-lg border border-transparent bg-[var(--settings-elevated)] p-2 hover:border-[var(--settings-border-soft)] hover:bg-[color-mix(in_oklab,var(--settings-elevated)_85%,transparent)] transition-colors"
            draggable
            onDragStart={(e) => onDragStart(e, node.type, node.label)}
          >
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--settings-panel)] border border-[var(--settings-border-soft)]", node.color)}>
              <node.icon className="h-4 w-4" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity min-w-0">
              <div className="text-xs font-medium text-[var(--settings-foreground-strong)]">{node.label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{node.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
