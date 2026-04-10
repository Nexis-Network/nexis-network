import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

import type { StrategySummary, StrategyWorkflow } from "./types";

export type StrategyDraft = {
  id: string;
  orgId: string;
  name: string;
  prompt: string;
  templateId?: string;
  blocklyXml?: string;
  workflow?: StrategyWorkflow;
  summary?: StrategySummary;
  createdAt: string;
  updatedAt: string;
};

type StrategyBuilderState = {
  drafts: StrategyDraft[];
  currentDraftId?: string;
  createDraft: (input: { orgId: string; prompt?: string; templateId?: string; name?: string }) => StrategyDraft;
  updateDraft: (id: string, updates: Partial<Omit<StrategyDraft, "id" | "createdAt">>) => void;
  removeDraft: (id: string) => void;
  setCurrentDraft: (id?: string) => void;
  reset: () => void;
  hydrate: (drafts: StrategyDraft[]) => void;
  upsertDraft: (draft: StrategyDraft, makeCurrent?: boolean) => void;
};

export const useStrategyBuilderStore = create<StrategyBuilderState>()(
  persist(
    (set, _get) => ({
      drafts: [],
      currentDraftId: undefined,
      createDraft: ({ orgId, prompt, templateId, name }) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const draft: StrategyDraft = {
          id,
          orgId,
          name: name ?? `Strategy Draft ${id.slice(-4)}`,
          prompt: prompt ?? "",
          templateId,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          drafts: [draft, ...state.drafts].slice(0, 25),
          currentDraftId: draft.id,
        }));
        return draft;
      },
      updateDraft: (id, updates) => {
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id
              ? {
                  ...draft,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : draft,
          ),
        }));
      },
      removeDraft: (id) => {
        set((state) => {
          const filtered = state.drafts.filter((draft) => draft.id !== id);
          const nextCurrent = state.currentDraftId === id ? filtered[0]?.id : state.currentDraftId;
          return {
            drafts: filtered,
            currentDraftId: nextCurrent,
          };
        });
      },
      setCurrentDraft: (id) => {
        set(() => ({ currentDraftId: id }));
      },
      reset: () => {
        set(() => ({ drafts: [], currentDraftId: undefined }));
      },
      hydrate: (drafts) => {
        set(() => ({
          drafts: drafts.slice(0, 50),
          currentDraftId: drafts[0]?.id,
        }));
      },
      upsertDraft: (draft, makeCurrent = false) => {
        set((state) => {
          const index = state.drafts.findIndex((item) => item.id === draft.id);
          const nextDrafts = index >= 0 ? state.drafts.map((item) => (item.id === draft.id ? draft : item)) : [draft, ...state.drafts];
          const currentDraftId = makeCurrent ? draft.id : state.currentDraftId ?? draft.id;
          return {
            drafts: nextDrafts.slice(0, 50),
            currentDraftId,
          };
        });
      },
    }),
    {
      name: "strategy-builder-store",
      partialize: (state) => ({
        drafts: state.drafts,
        currentDraftId: state.currentDraftId,
      }),
    },
  ),
);

export function getCurrentDraft() {
  const { drafts, currentDraftId } = useStrategyBuilderStore.getState();
  if (!currentDraftId) return undefined;
  return drafts.find((draft) => draft.id === currentDraftId);
}
