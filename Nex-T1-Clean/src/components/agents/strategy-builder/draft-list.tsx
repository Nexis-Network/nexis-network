"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import type { StrategyDraft } from "@/lib/strategies/store";
import { cn } from "@/lib/utils";

type StrategyDraftListProps = {
  drafts: StrategyDraft[];
  activeDraftId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
};

export function StrategyDraftList({ drafts, activeDraftId, onSelect, onDelete, onCreate }: StrategyDraftListProps) {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--settings-border-soft)] px-4 pb-2 pt-0">
        <h2 className="font-inter text-[14px] font-normal leading-5 text-[var(--settings-foreground-strong)]">Drafts</h2>
        
        <button
          onClick={onCreate}
          className="flex h-8 items-center gap-1 rounded-lg border border-[var(--settings-border)] bg-transparent px-2.5 text-[var(--settings-foreground-strong)] transition hover:bg-[var(--settings-elevated)] active:bg-[color-mix(in_oklab,var(--settings-elevated)_80%,transparent)]"
        >
          <Plus className="h-4 w-4 text-[var(--settings-foreground-strong)]" />
          <span className="font-inter text-[12px] font-medium leading-4 text-[var(--settings-foreground-strong)]">
            New draft
          </span>
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col space-y-0 pt-3">
        {drafts.length === 0 ? (
          <div className="px-4 py-4">
             <p className="font-inter text-[12px] text-[var(--settings-foreground-muted)]">No drafts yet.</p>
          </div>
        ) : (
          drafts.map((draft) => (
            <motion.div
              key={draft.id}
              onClick={() => onSelect(draft.id)}
              className={cn(
                "group relative flex w-full cursor-pointer flex-col gap-0.5 border-b border-[var(--settings-border-soft)] px-4 py-3 text-left transition",
                activeDraftId === draft.id
                  ? "bg-[color-mix(in_oklab,var(--settings-elevated)_75%,transparent)]"
                  : "hover:bg-[color-mix(in_oklab,var(--settings-elevated)_60%,transparent)]"
              )}
            >
               {/* Selection Indicator Line (Active Primary) or just Overlay? 
                   Screenshot shows 'New Strategy' text white, others might be dimmer? 
                   Let's stick to the overlay style for now. */}
              
              <div className="flex items-center justify-between">
                <span className="font-inter text-[14px] font-medium leading-5 text-[var(--settings-foreground-strong)] line-clamp-1">
                  {draft.name || "New Strategy"}
                </span>
                
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(draft.id);
                    }}
                    className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 p-1 text-[var(--settings-foreground-subtle)] hover:text-destructive"
                    aria-label="Delete draft"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                </button>
              </div>
              
              <span className="font-inter text-[11.8px] font-normal leading-4 text-[var(--settings-foreground-subtle)]">
                Updated {new Date(draft.updatedAt).toLocaleDateString()}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
