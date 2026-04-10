import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolExecutionOptions } from "ai";
import type {
  WorkingMemoryState,
} from "@/modules/chat/state/working-memory-store";
import { resolveToolExecutionResult } from "./create-tool";
import {
  workingMemoryTodosTool,
  type WorkingMemoryTodoInput,
  type WorkingMemoryTodoOutput,
} from "./working-memory-todos";

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
          updatedAt: new Date(0).toISOString(),
        }
      );
    }),
    writeWorkingMemoryState: vi.fn(
      async (scope: string, state: WorkingMemoryState) => {
        stateByScope.set(scope, {
          todos: state.todos.map((todo) => ({ ...todo })),
          updatedAt: state.updatedAt,
        });
      },
    ),
    clearWorkingMemoryState: vi.fn(async (scope: string) => {
      stateByScope.delete(scope);
    }),
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
  input: WorkingMemoryTodoInput,
): Promise<WorkingMemoryTodoOutput> {
  if (!workingMemoryTodosTool.execute) {
    throw new Error("Tool execute handler is missing");
  }
  return await resolveToolExecutionResult(
    workingMemoryTodosTool.execute(
      input,
      toolExecutionOptions,
    ),
  );
}

describe("workingMemoryTodosTool", () => {
  beforeEach(() => {
    stateByScope.clear();
    vi.clearAllMocks();
  });

  it("uses session scope and enforces a single in_progress todo", async () => {
    const createdA = await runTool({
      action: "create",
      title: "Task A",
    });
    const createdB = await runTool({
      action: "create",
      title: "Task B",
    });

    expect(createdA.workflowId).toBe("session:session_1");
    expect(createdB.workflowId).toBe("session:session_1");
    expect(createdA.taskId).toBeDefined();
    expect(createdB.taskId).toBeDefined();

    await runTool({
      action: "update_status",
      todoId: createdA.taskId,
      status: "in_progress",
    });
    const statusB = await runTool({
      action: "update_status",
      todoId: createdB.taskId,
      status: "in_progress",
    });

    const todos = statusB.todos ?? [];
    const inProgress = todos.filter((todo) => todo.status === "in_progress");

    expect(inProgress).toHaveLength(1);
    expect(inProgress[0]?.id).toBe(createdB.taskId);

    const taskA = todos.find((todo) => todo.id === createdA.taskId);
    expect(taskA?.status).toBe("pending");
  });

  it("rejects completion when required verification is missing", async () => {
    const created = await runTool({
      action: "create",
      title: "Verified task",
    });

    await runTool({
      action: "add_verification",
      todoId: created.taskId,
      verification: ["run unit tests"],
    });

    const completed = await runTool({
      action: "complete",
      todoId: created.taskId,
    });

    expect(completed.success).toBe(false);
    expect(completed.error).toBe("verification_incomplete");
  });

  it("rejects dependency updates that introduce cycles", async () => {
    const createdA = await runTool({
      action: "create",
      title: "Task A",
    });
    const createdB = await runTool({
      action: "create",
      title: "Task B",
    });
    expect(createdA.taskId).toBeDefined();
    expect(createdB.taskId).toBeDefined();
    const taskAId = createdA.taskId!;
    const taskBId = createdB.taskId!;

    const firstLink = await runTool({
      action: "link_dependencies",
      todoId: taskAId,
      blocks: [taskBId],
    });
    expect(firstLink.success).toBe(true);

    const secondLink = await runTool({
      action: "link_dependencies",
      todoId: taskBId,
      blocks: [taskAId],
    });
    expect(secondLink.success).toBe(false);
    expect(secondLink.error).toBe("dependency_cycle");
  });
});
