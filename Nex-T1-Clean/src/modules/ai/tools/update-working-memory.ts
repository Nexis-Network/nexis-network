import { nanoid } from "nanoid";

import {
  arrayProp,
  createTool,
  createToolSchema,
  enumProp,
  stringProp,
  type ToolExecutionContext,
} from "./create-tool";
import {
  computeWorkflowMetrics,
  readWorkingMemoryState,
  resolveWorkingMemoryScope,
  summarizeWorkingMemoryState,
  writeWorkingMemoryState,
  type WorkingMemoryEntry,
} from "@/modules/chat/state/working-memory-store";

type UpdateWorkingMemoryAction = "upsert" | "delete" | "clear" | "list";

export type UpdateWorkingMemoryInput = {
  action: UpdateWorkingMemoryAction;
  scopeId?: string;
  entryId?: string;
  content?: string;
  tags?: string[];
  replaceExisting?: string;
};

export type UpdateWorkingMemoryOutput = {
  success: boolean;
  type: "workflow_update";
  workflowId: string;
  stepName: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  summary: string;
  memoryEntry?: WorkingMemoryEntry;
  memoryEntries?: WorkingMemoryEntry[];
  error?: string;
};

const updateWorkingMemorySchema = createToolSchema(
  {
    action: enumProp("Working memory operation", ["upsert", "delete", "clear", "list"]),
    scopeId: stringProp("Optional explicit scope override"),
    entryId: stringProp("Memory entry identifier"),
    content: stringProp("Memory content to persist", { minLength: 1, maxLength: 2000 }),
    tags: arrayProp("Optional tags for memory categorization", stringProp("Tag"), {
      maxItems: 12,
    }),
    replaceExisting: enumProp(
      "When true, replace all existing entries with this one on upsert.",
      ["true", "false"],
      "false",
    ),
  },
  ["action"],
  { additionalProperties: false },
);

const MAX_MEMORY_ENTRIES = 64;

function getSessionId(context?: ToolExecutionContext): string | null {
  const sessionId = context?.metadata?.sessionId;
  return typeof sessionId === "string" && sessionId.trim().length > 0
    ? sessionId.trim()
    : null;
}

function normalizeTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function computeProgress(entriesCount: number, todoProgress: number): number {
  if (todoProgress > 0) return todoProgress;
  return entriesCount > 0 ? 100 : 0;
}

function buildOutput(args: {
  success: boolean;
  scope: string;
  stepName: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
  entries: WorkingMemoryEntry[];
  summary: string;
  entry?: WorkingMemoryEntry;
  error?: string;
}): UpdateWorkingMemoryOutput {
  const todoMetrics = computeWorkflowMetrics({
    todos: [],
    entries: args.entries,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: args.success,
    type: "workflow_update",
    workflowId: args.scope,
    stepName: args.stepName,
    status: args.status,
    progress: computeProgress(args.entries.length, todoMetrics.completed),
    message: args.message,
    summary: args.summary,
    memoryEntry: args.entry,
    memoryEntries: args.entries,
    error: args.error,
  };
}

export const updateWorkingMemoryTool = createTool<
  UpdateWorkingMemoryInput,
  UpdateWorkingMemoryOutput
>({
  description:
    "Update persistent working memory notes for the active chat/user scope. Use this to store concise durable notes between turns.",
  schema: updateWorkingMemorySchema,
  execute: async (input, context) => {
    const scope = resolveWorkingMemoryScope({
      scopeId: input.scopeId,
      sessionId: getSessionId(context),
      userId: context?.userId ?? null,
    });

    const state = await readWorkingMemoryState(scope);
    const entries = Array.isArray(state.entries) ? [...state.entries] : [];
    const now = new Date().toISOString();

    if (input.action === "list") {
      const summary = summarizeWorkingMemoryState({
        ...state,
        entries,
      });
      return buildOutput({
        success: true,
        scope,
        stepName: "List working memory",
        status: "completed",
        message: "Working memory listed.",
        entries,
        summary,
      });
    }

    if (input.action === "clear") {
      const nextState = {
        ...state,
        entries: [],
        updatedAt: now,
      };
      await writeWorkingMemoryState(scope, nextState);
      return buildOutput({
        success: true,
        scope,
        stepName: "Clear working memory",
        status: "completed",
        message: "Working memory cleared.",
        entries: [],
        summary: summarizeWorkingMemoryState(nextState),
      });
    }

    if (input.action === "delete") {
      const entryId = typeof input.entryId === "string" ? input.entryId.trim() : "";
      if (!entryId) {
        return buildOutput({
          success: false,
          scope,
          stepName: "Delete working memory entry",
          status: "failed",
          message: "entryId is required for delete.",
          entries,
          summary: summarizeWorkingMemoryState({
            ...state,
            entries,
          }),
          error: "missing_entry_id",
        });
      }

      const filtered = entries.filter((entry) => entry.id !== entryId);
      const nextState = {
        ...state,
        entries: filtered,
        updatedAt: now,
      };
      await writeWorkingMemoryState(scope, nextState);
      return buildOutput({
        success: true,
        scope,
        stepName: "Delete working memory entry",
        status: "completed",
        message: filtered.length === entries.length ? "No matching entry found." : "Memory entry deleted.",
        entries: filtered,
        summary: summarizeWorkingMemoryState(nextState),
      });
    }

    const content = typeof input.content === "string" ? input.content.trim() : "";
    if (!content) {
      return buildOutput({
        success: false,
        scope,
        stepName: "Upsert working memory entry",
        status: "failed",
        message: "content is required for upsert.",
        entries,
        summary: summarizeWorkingMemoryState({
          ...state,
          entries,
        }),
        error: "missing_content",
      });
    }

    const id =
      typeof input.entryId === "string" && input.entryId.trim().length > 0
        ? input.entryId.trim()
        : `wm_${nanoid()}`;
    const tags = normalizeTags(input.tags);
    const replaceExisting = input.replaceExisting === "true";

    const existingIndex = entries.findIndex((entry) => entry.id === id);
    const nextEntry: WorkingMemoryEntry = {
      id,
      content,
      tags,
      createdAt: existingIndex >= 0 ? entries[existingIndex].createdAt : now,
      updatedAt: now,
    };

    let nextEntries = replaceExisting ? [nextEntry] : [...entries];
    if (existingIndex >= 0) {
      nextEntries[existingIndex] = nextEntry;
    } else if (!replaceExisting) {
      nextEntries = [nextEntry, ...nextEntries];
    }

    nextEntries = nextEntries.slice(0, MAX_MEMORY_ENTRIES);

    const nextState = {
      ...state,
      entries: nextEntries,
      updatedAt: now,
    };
    await writeWorkingMemoryState(scope, nextState);

    return buildOutput({
      success: true,
      scope,
      stepName: "Upsert working memory entry",
      status: "completed",
      message: existingIndex >= 0 ? "Memory entry updated." : "Memory entry created.",
      entries: nextEntries,
      entry: nextEntry,
      summary: summarizeWorkingMemoryState(nextState),
    });
  },
});
