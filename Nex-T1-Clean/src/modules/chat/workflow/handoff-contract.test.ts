import { describe, it, expect } from "vitest";
import { HandoffSummarySchema } from "./handoff-contract";

// ---------------------------------------------------------------------------
// Factory for a valid handoff summary object
// ---------------------------------------------------------------------------

function makeValidHandoff(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    handoffId: "550e8400-e29b-41d4-a716-446655440000",
    createdAt: "2026-03-24T12:00:00Z",
    sessionId: null,
    userId: "user-abc",
    userIdentifier: null,
    requestSummary: "Swap 1 SOL for USDC on Jupiter",
    requestCategory: "defi",
    escalationReason: "confidence_below_threshold",
    escalationDetail: "Model confidence dropped below 0.4 after price check.",
    severity: "advisory",
    attemptedActions: [
      {
        toolName: "jupiter_swap",
        intent: "swap SOL to USDC",
        outcome: "blocked",
        detail: null,
        timestamp: "2026-03-24T11:59:00Z",
      },
    ],
    verifiedPrerequisites: [
      { check: "price_check", result: "pass", detail: null },
    ],
    monetaryImpact: null,
    recommendedAction: "Review the swap parameters and confirm manually.",
    confidenceNotes: null,
    workingMemorySnapshot: {
      activeTaskId: "task-1",
      todoSummary: "Swap pending",
      blockerSummary: null,
    },
    relevantArtifactIds: [],
    ...overrides,
  };
}

describe("HandoffSummarySchema", () => {
  it("parses a valid HandoffSummary successfully", () => {
    const result = HandoffSummarySchema.safeParse(makeValidHandoff());
    expect(result.success).toBe(true);
  });

  it("fails when required fields (userId, requestSummary, escalationReason) are missing", () => {
    const noUserId = HandoffSummarySchema.safeParse(
      makeValidHandoff({ userId: undefined }),
    );
    expect(noUserId.success).toBe(false);

    const noSummary = HandoffSummarySchema.safeParse(
      makeValidHandoff({ requestSummary: undefined }),
    );
    expect(noSummary.success).toBe(false);

    const noReason = HandoffSummarySchema.safeParse(
      makeValidHandoff({ escalationReason: undefined }),
    );
    expect(noReason.success).toBe(false);
  });

  it("fails with an invalid escalationReason value", () => {
    const result = HandoffSummarySchema.safeParse(
      makeValidHandoff({ escalationReason: "bad_reason" }),
    );
    expect(result.success).toBe(false);
  });

  it("fails with an invalid severity value", () => {
    const result = HandoffSummarySchema.safeParse(
      makeValidHandoff({ severity: "mega_critical" }),
    );
    expect(result.success).toBe(false);
  });

  it("allows optional fields (confidenceNotes, monetaryImpact) to be null", () => {
    const result = HandoffSummarySchema.safeParse(
      makeValidHandoff({
        confidenceNotes: null,
        monetaryImpact: null,
      }),
    );
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.confidenceNotes).toBeNull();
      expect(result.data.monetaryImpact).toBeNull();
    }
  });
});
