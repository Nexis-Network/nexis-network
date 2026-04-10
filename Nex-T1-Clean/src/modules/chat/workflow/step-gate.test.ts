import { describe, it, expect, vi, afterEach } from "vitest";
import type { ContextEnvelope } from "@/modules/chat/context-envelope";
import { computeStepGate } from "./step-gate";

// ---------------------------------------------------------------------------
// Mock envelope factory
// ---------------------------------------------------------------------------

function makeEnvelope(
  overrides: Partial<ContextEnvelope["memory"]> = {},
): ContextEnvelope {
  return {
    version: "test",
    turnId: "turn-1",
    sessionId: null,
    userId: null,
    route: "chat",
    traceId: null,
    prompt: {
      profileId: null,
      label: "test",
      versions: {},
      versionHash: null,
      systemHash: null,
    },
    memory: {
      summary: "",
      hash: null,
      scopes: [],
      facts: [],
      sources: [],
      workingState: { todos: [], entries: [], updatedAt: "2026-01-01T00:00:00Z" },
      activeTaskId: null,
      blockerGraph: [],
      verificationReceipts: [],
      promotionRules: [],
      ...overrides,
    },
    retrieval: { facts: [] },
    artifacts: { refs: [] },
    budget: {
      contextLimit: null,
      maxTokens: null,
      toolMaxInvocations: null,
      toolMaxConcurrent: null,
    },
    cache: {
      policyVersion: "test",
      readKey: null,
      writeKey: null,
      canRead: false,
      canWrite: false,
      reasons: [],
      memoryHash: null,
      marketContextHash: null,
      sessionSnapshotHash: null,
    },
  } satisfies ContextEnvelope;
}

const ALL_TOOL_IDS = [
  "evm_wallet_send_asset",
  "pumpfun_trader",
  "helius_solana",
  "cdp_wallet",
  "token_minter",
  "bitcoin_network",
  "worker",
  "coordinator",
  "research_tool",
  "chat_tool",
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("computeStepGate", () => {
  it("returns unrestricted result when NEX_WORKFLOW_GATES_ENABLED is not set", () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "");
    const result = computeStepGate(makeEnvelope(), ALL_TOOL_IDS, 0);
    expect(result.activeTools).toBeUndefined();
    expect(result.blockedTools.size).toBe(0);
    expect(result.blockedSubCommands.size).toBe(0);
    expect(result.currentPhase).toBe("unrestricted");
    expect(result.requiredNext).toBeNull();
  });

  it("blocks financial tools when verificationReceipts has no matching entry for the active task", () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    const envelope = makeEnvelope({
      activeTaskId: "task-1",
      verificationReceipts: [], // no receipts
      blockerGraph: [],
    });

    const result = computeStepGate(envelope, ALL_TOOL_IDS, 3);

    // Financial tools should be blocked
    expect(result.blockedTools.has("evm_wallet_send_asset")).toBe(true);
    expect(result.blockedTools.has("pumpfun_trader")).toBe(true);
    expect(result.blockedTools.has("helius_solana")).toBe(true);
    expect(result.blockedTools.has("cdp_wallet")).toBe(true);
    expect(result.blockedTools.has("token_minter")).toBe(true);
    expect(result.blockedTools.has("bitcoin_network")).toBe(true);

    // Financial tools should NOT be in activeTools
    expect(result.activeTools).toBeDefined();
    for (const ft of [
      "evm_wallet_send_asset",
      "pumpfun_trader",
      "helius_solana",
      "cdp_wallet",
      "token_minter",
      "bitcoin_network",
    ]) {
      expect(result.activeTools).not.toContain(ft);
    }
  });

  it("allows financial tools when verificationReceipts has matching price_check or simulation entry", () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    const envelope = makeEnvelope({
      activeTaskId: "task-1",
      verificationReceipts: [
        { taskId: "task-1", completed: ["price_check", "simulation"] },
      ],
      blockerGraph: [],
    });

    const result = computeStepGate(envelope, ALL_TOOL_IDS, 3);

    // Financial tools should NOT be blocked
    expect(result.blockedTools.has("evm_wallet_send_asset")).toBe(false);
    expect(result.blockedTools.has("pumpfun_trader")).toBe(false);
  });

  it("correctly computes currentPhase based on stepIndex", () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    const envelope = makeEnvelope({
      activeTaskId: "task-1",
      verificationReceipts: [
        { taskId: "task-1", completed: ["price_check", "simulation"] },
      ],
      blockerGraph: [],
    });

    expect(computeStepGate(envelope, ALL_TOOL_IDS, 0).currentPhase).toBe("planning");
    expect(computeStepGate(envelope, ALL_TOOL_IDS, 1).currentPhase).toBe("research");
    expect(computeStepGate(envelope, ALL_TOOL_IDS, 2).currentPhase).toBe("research");
    expect(computeStepGate(envelope, ALL_TOOL_IDS, 3).currentPhase).toBe("execution");
    expect(computeStepGate(envelope, ALL_TOOL_IDS, 10).currentPhase).toBe("execution");
  });

  it("populates blockedSubCommands for coordinator sub-command rules", () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    // No orchestrator in blocker graph => orchestrator prerequisite not met
    // => coordinator:start should be blocked as a sub-command
    const envelope = makeEnvelope({
      activeTaskId: "task-1",
      blockerGraph: [{ taskId: "orchestrator", blockedBy: ["something"] }],
      verificationReceipts: [
        { taskId: "task-1", completed: ["price_check", "simulation"] },
      ],
    });

    const result = computeStepGate(envelope, ALL_TOOL_IDS, 0);

    expect(result.blockedSubCommands.has("coordinator")).toBe(true);
    expect(result.blockedSubCommands.get("coordinator")?.has("start")).toBe(true);
  });

  it("does not block non-gated tools", () => {
    vi.stubEnv("NEX_WORKFLOW_GATES_ENABLED", "true");

    const envelope = makeEnvelope({
      activeTaskId: "task-1",
      verificationReceipts: [],
      blockerGraph: [{ taskId: "orchestrator", blockedBy: ["pending"] }],
    });

    const result = computeStepGate(envelope, ALL_TOOL_IDS, 0);

    // Non-gated tools should be in activeTools
    expect(result.activeTools).toContain("research_tool");
    expect(result.activeTools).toContain("chat_tool");
    expect(result.activeTools).toContain("coordinator");
    // They should not be in blockedTools
    expect(result.blockedTools.has("research_tool")).toBe(false);
    expect(result.blockedTools.has("chat_tool")).toBe(false);
  });
});
