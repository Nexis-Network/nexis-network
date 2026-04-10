"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Flag, Bot, Workflow, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// --- Base Node Wrapper ---
const BaseNode = ({
  children,
  selected,
  className,
  title,
  icon: _Icon,
  colorClass: _colorClass, // Kept for logic if needed, but styling is overridden to strict specs
}: {
  children?: React.ReactNode;
  selected?: boolean;
  className?: string;
  title: string;
  icon: UntypedJson;
  colorClass?: string;
}) => {
  return (
    <div
      className={cn(
        "group relative flex min-w-[193px] flex-col overflow-hidden rounded-[8px] border border-[var(--settings-border)] bg-[var(--settings-card-bg)] shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-all duration-200",
        selected ? "ring-1 ring-[var(--settings-accent)]" : "hover:border-[var(--settings-border-strong)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-0.5 border-b border-transparent bg-[var(--settings-elevated)] px-1.5 pb-1.5 pt-1.5 rounded-t-[8px]">
        {/* If we want the icon: The screenshot shows specific icons or none? 
            Looking at 'Decision Point' in screenshot: NO icon visible in the header bar. Just Text. 
            The sample screenshot text is 'Decision Point' / 'Success Path'.
            I will HIDE the icon to match strict verification unless explicitly requested.
        */}
        <span className="font-geist text-[8px] font-semibold leading-[8px] text-[var(--settings-foreground-strong)] pl-0.5">{title}</span>
        {/* Subtitle placeholder if needed in header? Screenshot has 'Route based on conditions' BELOW title but in the same block?
            Screenshot: 
            [Header Darker #262626]
              [Title: Decision Point] (White, Bold, 8px)
              [Subtitle: Route based on conditions] (Gray, Regular, 7px) - Wait, looking at the hierarchy. 
              Actually, the screenshot XML says:
              Group (#171717) -> Background+HorizontalBorder (#262626) -> Decision Point.
              Then below that (in #171717 body?) -> 'Route based on conditions'. 
            Let's re-read the CSS.
            'Decision Point' is inside the #262626 block.
            'Route based on conditions' is ... also inside?
            Wait, the XML structure says:
            Group (#171717)
              Background+HorizontalBorder (#262626)
                 Decision Point (Title)
              Container (#171717 body area)
                 Route based on conditions (Subtitle)
        
        So Header = Title Only. Body = Subtitle + Content.
        */}
      </div>
      
      {/* Body: #171717 area */}
      {/* Screenshot Body has 'Route based on conditions' immediately? 
          Okay, let's treat children as the body content. */}
      {children && <div className="flex flex-col gap-1 p-1.5 text-[7px] text-[var(--settings-foreground-muted)]">{children}</div>}
    </div>
  );
};

// --- Custom Nodes ---

export const StartNode = memo(({ selected, data }: NodeProps) => {
  return (
    <BaseNode
      title="Start"
      icon={Flag}
      colorClass="from-zinc-800 to-zinc-900 shadow-inner"
      selected={selected}
      className={cn("w-[200px]", data.isInvalid ? "border-red-500/50" : "")}
    >
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--settings-foreground-subtle)] !w-3 !h-3 !-bottom-1.5 !border-2 !border-[var(--settings-card-bg)]" />
      <div className="text-center text-xs text-muted-foreground/60">Strategy Entry Point</div>
    </BaseNode>
  );
});
StartNode.displayName = "StartNode";

export const ToolNode = memo(({ selected, data }: NodeProps) => {
  return (
    <BaseNode
      title="Dispatch Tool"
      icon={Bot}
      colorClass="from-indigo-600/20 to-blue-600/20 text-indigo-400"
      selected={selected}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--settings-foreground-subtle)] !w-3 !h-3 !-top-1.5 !border-2 !border-[var(--settings-card-bg)]" />
      <div className="space-y-2">
        <p className="line-clamp-2">
            {data.description ? String(data.description) : "Use an AI tool or MCP server capability."}
        </p>
        <div className="flex flex-wrap gap-1">
            {data.toolName ? (
                 <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] h-5">
                    {String(data.toolName)}
                 </Badge>
            ) : (
                <Badge variant="outline" className="border-[var(--settings-border-soft)] bg-[var(--settings-elevated)] text-[var(--settings-foreground-subtle)] text-[10px] h-5">Select tool</Badge>
            )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="success" className="!bg-emerald-500 !w-3 !h-3 !-bottom-1.5 !left-1/3 !border-2 !border-[var(--settings-card-bg)]" />
      <Handle type="source" position={Position.Bottom} id="failure" className="!bg-red-500 !w-3 !h-3 !-bottom-1.5 !left-2/3 !border-2 !border-[var(--settings-card-bg)]" />
      
      {/* Labels for handles */}
      <div className="absolute bottom-1 left-1/3 -translate-x-1/2 text-[9px] font-medium text-emerald-700 dark:text-emerald-400/80 -mb-4">Success</div>
      <div className="absolute bottom-1 left-2/3 -translate-x-1/2 text-[9px] font-medium text-red-500/80 -mb-4">Failure</div>
    </BaseNode>
  );
});
ToolNode.displayName = "ToolNode";

export const LogicNode = memo(({ selected, data }: NodeProps) => {
  return (
    <BaseNode
      title={String(data.label || "Logic Decision")}
      icon={Workflow}
      colorClass="from-amber-600/20 to-orange-600/20 text-amber-400"
      selected={selected}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--settings-foreground-subtle)] !w-3 !h-3 !-top-1.5 !border-2 !border-[var(--settings-card-bg)]" />
      <div className="space-y-2">
        <p className="line-clamp-2">{data.condition ? String(data.condition) : "Branch based on conditions."}</p>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="!bg-[var(--settings-foreground-subtle)] !w-3 !h-3 !-bottom-1.5 !left-1/3 !border-2 !border-[var(--settings-card-bg)]" />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-[var(--settings-foreground-subtle)] !w-3 !h-3 !-bottom-1.5 !left-2/3 !border-2 !border-[var(--settings-card-bg)]" />

      <div className="absolute bottom-1 left-1/3 -translate-x-1/2 text-[9px] font-medium text-muted-foreground -mb-4">True</div>
      <div className="absolute bottom-1 left-2/3 -translate-x-1/2 text-[9px] font-medium text-muted-foreground -mb-4">False</div>
    </BaseNode>
  );
});
LogicNode.displayName = "LogicNode";


export const EndNode = memo(({ selected }: NodeProps) => {
  return (
    <BaseNode
      title="End"
      icon={Scissors}
      colorClass="from-zinc-800 to-zinc-900 border-zinc-800"
      selected={selected}
      className="w-[180px]"
    >
       <Handle type="target" position={Position.Top} className="!bg-[var(--settings-foreground-subtle)] !w-3 !h-3 !-top-1.5 !border-2 !border-[var(--settings-card-bg)]" />
      <div className="text-center text-xs text-muted-foreground/60">Terminate Workflow</div>
    </BaseNode>
  );
});
EndNode.displayName = "EndNode";

export const nodeTypes = {
  strategy_start: StartNode,
  strategy_tool: ToolNode,
  strategy_logic: LogicNode,
  strategy_end: EndNode,
};
