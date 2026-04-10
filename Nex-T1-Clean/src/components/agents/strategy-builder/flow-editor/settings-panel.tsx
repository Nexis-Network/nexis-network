"use client";

import { useEffect, useState } from "react";
import { Node } from "@xyflow/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Placeholder for MCP tools - in a real app these would come from the registry/API
const AVAILABLE_TOOLS = [
  { id: "weather_tool", name: "Get Weather", description: "Fetch weather data for a location" },
  { id: "stock_price", name: "Stock Price", description: "Get real-time stock quotes" },
  { id: "sentiment_analysis", name: "Sentiment Analysis", description: "Analyze text sentiment" },
];

interface SettingsPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: Record<string, UntypedJson>) => void;
  onClose: () => void;
}

export function SettingsPanel({ selectedNode, onUpdateNode, onClose }: SettingsPanelProps) {
  const [localData, setLocalData] = useState<Record<string, UntypedJson>>({});

  useEffect(() => {
    if (selectedNode) {
      if (selectedNode.data && typeof selectedNode.data === "object") {
        setLocalData(selectedNode.data as Record<string, UntypedJson>);
      } else {
        setLocalData({});
      }
    }
  }, [selectedNode]);

  const handleChange = (key: string, value: UntypedJson) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, newData);
    }
  };

  if (!selectedNode) return null;

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 rounded-xl border border-[var(--settings-border)] bg-[color-mix(in_oklab,var(--settings-panel)_92%,transparent)] shadow-2xl backdrop-blur-md flex flex-col z-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--settings-border-soft)] px-4 py-3">
        <h3 className="text-sm font-medium text-[var(--settings-foreground-strong)]">Node Settings</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--settings-foreground-subtle)] hover:text-[var(--settings-foreground-strong)]" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs uppercase text-[var(--settings-foreground-subtle)] border-[var(--settings-border-soft)]">
            {selectedNode.type?.replace("strategy_", "")}
          </Badge>
          <div className="text-xs text-muted-foreground font-mono">{selectedNode.id}</div>
        </div>

        {/* Common Field: Label/Description */}
        {selectedNode.type !== "strategy_start" && selectedNode.type !== "strategy_end" && (
            <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Description / Label</Label>
            <Input
                value={
                  (typeof localData.description === "string" ? localData.description : null) ??
                  (typeof localData.label === "string" ? localData.label : "")
                }
                onChange={(e) => handleChange(selectedNode.type === "strategy_logic" ? "label" : "description", e.target.value)}
                className="text-xs focus-visible:ring-[var(--settings-border-strong)]"
                placeholder="Describe this step..."
            />
            </div>
        )}

        {/* Start Node Config */}
        {selectedNode.type === "strategy_start" && (
             <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300">
                This is the entry point of your strategy. Trigger configuration will be available here soon.
             </div>
        )}

        {/* Tool Node Config */}
        {selectedNode.type === "strategy_tool" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select Tool</Label>
              <Select
                value={typeof localData.toolName === "string" ? localData.toolName : ""}
                onValueChange={(val) => handleChange("toolName", val)}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Choose a tool..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_TOOLS.map((tool) => (
                    <SelectItem key={tool.id} value={tool.name} className="text-xs">
                      {tool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Parameters (JSON)</Label>
               <Textarea 
                value={
                  typeof localData.params === "string"
                    ? localData.params
                    : JSON.stringify(localData.params ?? {}, null, 2)
                }
                onChange={(e) => handleChange("params", e.target.value)}
                className="font-mono text-[10px] min-h-[100px]"
                placeholder="{}"
               />
             </div>
          </>
        )}

        {/* Logic Node Config */}
        {selectedNode.type === "strategy_logic" && (
             <div className="space-y-2">
             <Label className="text-xs text-muted-foreground">Condition</Label>
             <Textarea
                value={typeof localData.condition === "string" ? localData.condition : ""}
                onChange={(e) => handleChange("condition", e.target.value)}
                className="text-xs min-h-[80px]"
                placeholder="e.g. output.confidence > 0.8"
             />
             <p className="text-[10px] text-muted-foreground">
                Expression that returns true or false. You can reference variables from previous steps.
             </p>
             </div>
        )}

      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
