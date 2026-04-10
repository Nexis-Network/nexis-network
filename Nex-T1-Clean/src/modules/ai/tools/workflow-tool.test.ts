import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolExecutionOptions } from "ai";

import {
  researchAgentWorkflow,
  WORKFLOW_POSTGRES_RUNTIME_STATUS,
} from "@/lib/workflow/definitions";
import { workflowClient } from "@/lib/workflow/client";
import { startDurableWorkflowTool } from "./workflow-tool";

vi.mock("@/lib/workflow/client", () => ({
  workflowClient: {
    trigger: vi.fn(),
  },
}));

vi.mock("@/lib/workflow/definitions", () => ({
  researchAgentWorkflow: vi.fn(),
  WORKFLOW_POSTGRES_RUNTIME_STATUS: "experimental",
}));

const toolExecutionOptions: ToolExecutionOptions = {
  toolCallId: "test-tool-call",
  messages: [],
};

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value;
}

async function runTool<TInput, TOutput>(
  target: {
    execute?: (
      input: TInput,
      options: ToolExecutionOptions,
    ) => PromiseLike<TOutput> | TOutput | AsyncIterable<TOutput>;
  },
  input: TInput,
): Promise<TOutput> {
  if (!target.execute) {
    throw new Error("Tool execute handler is missing");
  }

  const result = target.execute(input, toolExecutionOptions);
  if (isAsyncIterable<TOutput>(result)) {
    for await (const chunk of result) {
      return chunk;
    }
    throw new Error("Tool returned an empty async iterable");
  }

  return await Promise.resolve(result);
}

describe("startDurableWorkflowTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a workflow and returns run metadata", async () => {
    vi.mocked(workflowClient.trigger).mockResolvedValue({ runId: "run_123" });

    const result = await runTool(startDurableWorkflowTool, {
      topic: "Analyze market breadth",
      depth: 2,
    });

    expect(workflowClient.trigger).toHaveBeenCalledWith({
      workflow: researchAgentWorkflow,
      args: [{ topic: "Analyze market breadth", depth: 2 }],
    });
    expect(result).toEqual({
      success: true,
      runId: "run_123",
      workflowId: "run_123",
      runtimeStatus: WORKFLOW_POSTGRES_RUNTIME_STATUS,
      message: "Experimental workflow started successfully. Run ID: run_123.",
    });
  });

  it("returns a failure payload when trigger fails", async () => {
    vi.mocked(workflowClient.trigger).mockRejectedValue(new Error("workflow unavailable"));

    const result = await runTool(startDurableWorkflowTool, {
      topic: "Analyze market breadth",
    });

    expect(result).toEqual({
      success: false,
      runtimeStatus: WORKFLOW_POSTGRES_RUNTIME_STATUS,
      error: "workflow unavailable",
    });
  });
});
