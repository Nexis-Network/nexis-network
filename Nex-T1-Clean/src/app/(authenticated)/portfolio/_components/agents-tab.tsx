"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";

/**
 * Agent shape returned from /api/agents/list after server-side mapping.
 * Mirrors the AgentListItem type defined in @/lib/agents/types but kept
 * lightweight for the client bundle.
 */
interface AgentPerformance {
  realizedPnlUsd: number;
  winRatePercent: number | null;
  totalTrades: number;
  wins: number;
  losses: number;
}

interface AgentListItem {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string | null;
  avatarUrl: string | null;
  listingSummary: Array<{
    listingType: string;
    networkId: string;
    priceBaseUnits: string;
  }>;
  performance?: AgentPerformance;
}

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((d) => d.items as AgentListItem[]);

export function AgentsTab() {
  const { data: agentsData, error, isLoading } = useSWR<AgentListItem[]>('/api/agents/list', fetcher);
  const agents = agentsData ?? [];
  const [selectedAgent, setSelectedAgent] = useState<AgentListItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openSettings = (agent: AgentListItem) => {
    setSelectedAgent(agent);
    setIsSettingsOpen(true);
  };

  const getGradient = (name: string, id: string) => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + id.charCodeAt(0);
    const complexGradients = [
      "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-400 via-purple-500 to-pink-500",
      "bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))] from-fuchsia-500 via-red-600 to-orange-400",
      "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200 via-violet-600 to-sky-900",
      "bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-slate-900 via-purple-900 to-slate-900",
      "bg-gradient-to-tr from-emerald-500 to-lime-600",
      "bg-gradient-to-bl from-rose-400 via-fuchsia-500 to-indigo-500",
      "bg-[conic-gradient(from_90deg_at_50%_50%,_var(--tw-gradient-stops))] from-gray-900 via-purple-900 to-violet-600",
    ];
    return complexGradients[hash % complexGradients.length];
  };

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Agents...</div>;
  if (error) return <div className="p-12 text-center text-red-400">Failed to load agents</div>;

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col mb-4">
        <h3 className="text-base font-medium text-foreground">Agents</h3>
        <span className="text-xs text-muted-foreground">{agents.length} total</span>
      </div>

      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground font-normal uppercase tracking-wide">
          <div className="col-span-5">Agent</div>
          <div className="col-span-2 text-right">Win Rate</div>
          <div className="col-span-3 text-right">PnL (USD)</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {agents.length === 0 && !isLoading && (
            <div className="py-8 text-center text-xs text-muted-foreground">No agents found.</div>
          )}

          {agents.map((agent) => {
             const pnl = agent.performance?.realizedPnlUsd ?? 0;
             const isPositive = pnl >= 0;
             const winRate = agent.performance?.winRatePercent;

             return (
              <div
                key={agent.id}
                className="group grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-transparent transition-colors border-b border-transparent hover:border-border cursor-pointer rounded-lg relative"
              >
                {/* Agent Name */}
                <div className="col-span-5 flex items-center gap-3">
                   <div className={cn("h-8 w-8 rounded-full shadow-lg ring-1 ring-white/10", getGradient(agent.name, agent.id))} />
                   <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{agent.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">{agent.description || "No description"}</span>
                   </div>
                </div>

                {/* Win Rate */}
                <div className="col-span-2 text-right">
                   <span className="text-sm text-muted-foreground">
                     {winRate != null ? `${winRate.toFixed(1)}%` : "\u2014"}
                   </span>
                </div>

                {/* PnL */}
                <div className="col-span-3 text-right flex flex-col items-end">
                   <span className={cn("text-sm font-medium", isPositive ? "text-[#1affb9]" : "text-red-500")}>
                     {isPositive ? "+" : "-"}${Math.abs(pnl).toLocaleString()}
                   </span>
                </div>

                {/* Actions (Settings) */}
                <div className="col-span-2 text-right flex items-center justify-end gap-2">
                   <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-[#c4c4c4]/70 hover:text-[#c4c4c4] hover:bg-transparent p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSettings(agent);
                      }}
                   >
                     Settings
                   </Button>

                   {/* Hover Action Arrow */}
                   <div className="w-8 h-8 rounded-full bg-muted dark:bg-[#252525] flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <ArrowRight className="w-4 h-4" />
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AgentSettingsModal
        agent={selectedAgent}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}

function AgentSettingsModal({ agent, open, onOpenChange }: { agent: AgentListItem | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background dark:bg-[#0D0D0D] border-border/50">
        <DialogHeader>
          <DialogTitle>Agent Configuration</DialogTitle>
          <DialogDescription>
             Configure settings for {agent.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
           <div className="grid gap-2">
             <Label htmlFor="risk" className="text-xs font-medium text-muted-foreground">Risk Level</Label>
             <Input id="risk" defaultValue="Medium" className="bg-muted/10 border-border/40" />
           </div>
           <div className="grid gap-2">
             <Label htmlFor="limit" className="text-xs font-medium text-muted-foreground">Stop Loss Limit ($)</Label>
             <Input id="limit" defaultValue="5000" type="number" className="bg-muted/10 border-border/40" />
           </div>
           <div className="grid gap-2">
             <Label htmlFor="strategy" className="text-xs font-medium text-muted-foreground">Strategy Mode</Label>
             <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted/20 border-[#1affb9]/30 text-[#1affb9]">Conservative</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted/20 border-border/40 text-muted-foreground">Aggressive</Badge>
             </div>
           </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            toast.success("Settings Saved");
            onOpenChange(false);
          }} className="bg-[#1affb9]/10 text-[#1affb9] hover:bg-[#1affb9]/20">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
