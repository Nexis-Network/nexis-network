import { describe, it, expect, vi, afterEach } from "vitest";
import { checkToolPrerequisites } from "./prerequisite-gate";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/modules/chat/state/working-memory-store", () => ({
  readWorkingMemoryState: vi.fn(),
  resolveWorkingMemoryScope: vi.fn(() => "test-scope"),
}));

import {
  readWorkingMemoryState,
} from "@/modules/chat/state/working-memory-store";

const mockReadState = vi.mocked(readWorkingMemoryState);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTodo(overrides: Record<string, unknown> = {}) {
  return {
    id: "todo-1",
    title: "Test task",
    status: "in_progress" as const,
    blocks: [],
    blockedBy: [],
    verification: [],
    completedVerification: [] as string[],
    nextActions: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeState(todos: ReturnType<typeof makeTodo>[] = []) {
  return {
    todos,
    entries: [],
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("checkToolPrerequisites", () => {
  it("returns allowed: true when gate is disabled (env not set)", async () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "");
    const result = await checkToolPrerequisites({
      toolName: "evm_wallet_send_asset",
      input: {},
    });
    expect(result.allowed).toBe(true);
  });

  it("returns allowed: true for non-gated tools", async () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    const result = await checkToolPrerequisites({
      toolName: "some_random_tool",
      input: {},
    });
    expect(result.allowed).toBe(true);
    // readWorkingMemoryState should not have been called for ungated tools
    expect(mockReadState).not.toHaveBeenCalled();
  });

  it("returns allowed: false with missing prerequisites when active task has no completedVerification", async () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    mockReadState.mockResolvedValue(
      makeState([makeTodo({ completedVerification: [] })]),
    );

    const result = await checkToolPrerequisites({
      toolName: "evm_wallet_send_asset",
      input: {},
      userId: "user-1",
    });

    expect(result.allowed).toBe(false);
    expect(result.missingPrerequisites).toBeDefined();
    expect(result.missingPrerequisites!.length).toBeGreaterThan(0);
    expect(result.ruleId).toBe("financial-requires-verification");
  });

  it("returns allowed: true when active task has the required verification", async () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    mockReadState.mockResolvedValue(
      makeState([
        makeTodo({
          completedVerification: [
            "verification:price_check",
            "verification:simulation",
          ],
        }),
      ]),
    );

    const result = await checkToolPrerequisites({
      toolName: "evm_wallet_send_asset",
      input: {},
      userId: "user-1",
    });

    expect(result.allowed).toBe(true);
  });

  it("handles sub-command matching: coordinator with input.action = 'start'", async () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    // coordinator:start is gated by orchestrator prerequisite
    // No active task with completed orchestrator verification
    mockReadState.mockResolvedValue(
      makeState([makeTodo({ completedVerification: [] })]),
    );

    const result = await checkToolPrerequisites({
      toolName: "coordinator",
      input: { action: "start" },
      userId: "user-1",
    });

    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe("coordinator-start-after-plan");
  });
});
