import { describe, expect, it } from "vitest";

import {
  buildChainOfThoughtSteps,
  buildQueueData,
  buildWorkflowItems,
  collectReasoningSegments,
  resolveWorkflowStatus,
} from "./assistant-workflow.utils";

describe("assistant workflow helpers", () => {
  it("deduplicates cumulative reasoning parts into stable segments", () => {
    const segments = collectReasoningSegments(
      [
        { type: "reasoning", text: "Inspect the request\n\nGather live market context" },
        {
          type: "reasoning",
          text: "Inspect the request\n\nGather live market context\n\nDraft the response",
        },
      ],
      [{ thought: "Inspect the request", ideaFragment: "Inspect the request" }],
    );

    expect(segments).toEqual([
      "Inspect the request",
      "Gather live market context",
      "Draft the response",
    ]);
  });

  it("builds workflow items from native tasks and tool executions", () => {
    const items = buildWorkflowItems(
      [
        {
          id: "task-1",
          title: "Analyze liquidity",
          description: "Check venue depth before quoting",
          status: "in_progress",
        },
      ],
      [
        {
          toolCallId: "tool-1",
          toolName: "openai_code_interpreter",
          status: "executing",
          input: {
            code: "print('hello')",
          },
        },
      ],
    );

    expect(items).toEqual([
      {
        id: "task-1",
        title: "Analyze liquidity",
        description: "Check venue depth before quoting",
        status: "in_progress",
        kind: "task",
      },
      {
        id: "tool-1",
        title: "OpenAI Code Interpreter",
        description: "Streaming generated code to the workbench",
        status: "in_progress",
        kind: "tool",
      },
    ]);
    expect(resolveWorkflowStatus(items)).toBe("in_progress");
  });

  it("derives queue buckets and source-aware chain steps", () => {
    const workflowItems = buildWorkflowItems(
      [],
      [
        {
          toolCallId: "tool-1",
          toolName: "search_market_data",
          status: "pending",
          input: { query: "BTC liquidity" },
        },
        {
          toolCallId: "tool-2",
          toolName: "render_report",
          status: "complete",
          input: { path: "reports/btc.md" },
        },
      ],
    );

    const queue = buildQueueData(null, workflowItems);
    expect(queue?.pending).toHaveLength(1);
    expect(queue?.completed).toHaveLength(1);
    expect(queue?.failed).toHaveLength(0);

    const steps = buildChainOfThoughtSteps({
      reasoningSegments: [],
      workflowItems,
      isStreaming: true,
      sources: [
        {
          id: "source-1",
          title: "CoinGecko",
          url: "https://www.coingecko.com/en/coins/bitcoin",
        },
      ],
    });

    expect(steps[0]).toMatchObject({
      id: "tool-1",
      label: "Search Market Data",
      status: "pending",
      sourceBadges: ["coingecko.com"],
    });
  });
});
