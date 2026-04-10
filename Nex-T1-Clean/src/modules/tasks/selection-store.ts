"use client";

import { create } from "zustand";

import type { NormalizedTask } from "@/modules/tasks";

type TaskSelectionState = {
  selectedTask: NormalizedTask | null;
  selectTask: (task: NormalizedTask) => void;
  clearSelection: () => void;
};

export const useTaskSelectionStore = create<TaskSelectionState>((set) => ({
  selectedTask: null,
  selectTask: (task) => set({ selectedTask: task }),
  clearSelection: () => set({ selectedTask: null }),
}));
