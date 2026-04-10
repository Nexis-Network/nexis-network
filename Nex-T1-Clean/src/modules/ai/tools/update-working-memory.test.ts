import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolExecutionOptions } from "ai";

import type { WorkingMemoryState } from "@/modules/chat/state/working-memory-store";
import { resolveToolExecutionResult } from "./create-tool";
import {
  updateWorkingMemoryTool,
  type UpdateWorkingMemoryInput,
  type UpdateWorkingMemoryOutput,
} from "./update-working-memory";

const stateByScope = new Map<string, WorkingMemoryState>();

vi.mock("@/modules/chat/state/working-memory-store", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/chat/state/working-memory-store")
  >("@/modules/chat/state/working-memory-store");

  return {
    ...actual,
    readWorkingMemoryState: vi.fn(async (scope: string) => {
      return (
        stateByScope.get(scope) ?? {
          todos: [],
          entries: [],
          updatedAt: new Date(0).toISOString(),
        }
      );
    }),
    writeWorkingMemoryState: vi.fn(
      async (scope: string, state: WorkingMemoryState) => {
        stateByScope.set(scope, {
          todos: state.todos.map((todo) => ({ ...todo })),
          entries: (state.entries ?? []).map((entry) => ({ ...entry })),
          updatedAt: state.updatedAt,
        });
      },
    ),
  };
});

const toolExecutionOptions = {
  toolCallId: "test-tool-call",
  messages: [],
  userId: "user_1",
  metadata: {
    sessionId: "session_1",
  },
} as unknown as ToolExecutionOptions;

async function runTool(
  input: UpdateWorkingMemoryInput,
): Promise<UpdateWorkingMemoryOutput> {
  if (!updateWorkingMemoryTool.execute) {
    throw new Error("Tool execute handler is missing");
  }
  return await resolveToolExecutionResult(
    updateWorkingMemoryTool.execute(input, toolExecutionOptions),
  );
}

describe("updateWorkingMemoryTool", () => {
  beforeEach(() => {
    stateByScope.clear();
    vi.clearAllMocks();
  });

  it("creates and lists memory entries in session scope", async () => {
    const created = await runTool({
      action: "upsert",
      content: "User prefers concise DeFi risk summaries.",
      tags: ["preference", "risk"],
    });

    expect(created.success).toBe(true);
    expect(created.workflowId).toBe("session:session_1");
    expect(created.memoryEntries?.length).toBe(1);

    const listed = await runTool({ action: "list" });
    expect(listed.success).toBe(true);
    expect(listed.memoryEntries?.[0]?.content).toContain("concise DeFi risk summaries");
  });

  it("deletes an existing memory entry", async () => {
    const created = await runTool({
      action: "upsert",
      content: "Track Polymarket positions daily.",
      tags: ["task"],
    });

    const entryId = created.memoryEntry?.id;
    expect(entryId).toBeDefined();

    const deleted = await runTool({
      action: "delete",
      entryId,
    });

    expect(deleted.success).toBe(true);
    expect(deleted.memoryEntries).toHaveLength(0);
  });

  it("clears working memory entries", async () => {
    await runTool({
      action: "upsert",
      content: "Remember preferred chain is Base.",
    });

    const cleared = await runTool({ action: "clear" });
    expect(cleared.success).toBe(true);
    expect(cleared.memoryEntries).toHaveLength(0);
  });
});
