/**
 * BudgetController Integration Tests
 *
 * Tests default limits, custom limits, turn/cost/token limit enforcement,
 * budget summary reporting, utilization calculations, and edge cases.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { SessionCostTracker } from "../../middleware/cost-tracker";
import { BudgetController } from "../budget";
import type { StepUsage } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCostTracker(sessionId = "test-budget"): SessionCostTracker {
  return new SessionCostTracker(sessionId);
}

function makeStep(overrides: Partial<StepUsage> = {}): StepUsage {
  return {
    model: "gpt-4o",
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    reasoningTokens: 0,
    durationMs: 100,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Default limits
// ---------------------------------------------------------------------------

describe("BudgetController — default limits", () => {
  it("uses generous defaults when no config is provided", () => {
    const ctrl = new BudgetController(makeCostTracker());
    const limits = ctrl.getLimits();

    expect(limits.maxTurns).toBe(50);
    expect(limits.maxBudgetUsd).toBe(5);
    expect(limits.maxInputTokens).toBe(1_000_000);
    expect(limits.maxOutputTokens).toBe(200_000);
  });

  it("starts with continue decision and zero counters", () => {
    const ctrl = new BudgetController(makeCostTracker());
    const summary = ctrl.getBudgetSummary();

    expect(summary.turnsUsed).toBe(0);
    expect(summary.costUsedUsd).toBe(0);
    expect(summary.inputTokensUsed).toBe(0);
    expect(summary.outputTokensUsed).toBe(0);
    expect(summary.lastDecision).toBe("continue");
    expect(ctrl.isStopped()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Custom limits
// ---------------------------------------------------------------------------

describe("BudgetController — custom limits", () => {
  it("merges partial overrides with defaults", () => {
    const ctrl = new BudgetController(makeCostTracker(), {
      maxTurns: 10,
      maxBudgetUsd: 0.5,
    });
    const limits = ctrl.getLimits();

    expect(limits.maxTurns).toBe(10);
    expect(limits.maxBudgetUsd).toBe(0.5);
    // Defaults preserved for unset fields
    expect(limits.maxInputTokens).toBe(1_000_000);
    expect(limits.maxOutputTokens).toBe(200_000);
  });

  it("applies all four overrides", () => {
    const ctrl = new BudgetController(makeCostTracker(), {
      maxTurns: 3,
      maxBudgetUsd: 0.01,
      maxInputTokens: 5000,
      maxOutputTokens: 2000,
    });
    const limits = ctrl.getLimits();

    expect(limits.maxTurns).toBe(3);
    expect(limits.maxBudgetUsd).toBe(0.01);
    expect(limits.maxInputTokens).toBe(5000);
    expect(limits.maxOutputTokens).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// Turn limit enforcement
// ---------------------------------------------------------------------------

describe("BudgetController — turn limit", () => {
  it("stops when turn limit is reached", () => {
    const ctrl = new BudgetController(makeCostTracker("turn-test"), {
      maxTurns: 3,
    });

    expect(ctrl.checkBudget(makeStep())).toBe("continue");
    expect(ctrl.checkBudget(makeStep())).toBe("continue");
    // Third turn hits the limit
    expect(ctrl.checkBudget(makeStep())).toBe("stop_turns");
    expect(ctrl.isStopped()).toBe(true);
    expect(ctrl.getTurnsUsed()).toBe(3);
  });

  it("reports correct turn utilization at boundary", () => {
    const ctrl = new BudgetController(makeCostTracker("turn-util"), {
      maxTurns: 2,
    });

    ctrl.checkBudget(makeStep());
    const summary = ctrl.getBudgetSummary();
    expect(summary.turnUtilization).toBeCloseTo(0.5, 4);

    ctrl.checkBudget(makeStep());
    const final = ctrl.getBudgetSummary();
    expect(final.turnUtilization).toBeCloseTo(1.0, 4);
  });
});

// ---------------------------------------------------------------------------
// Cost limit enforcement
// ---------------------------------------------------------------------------

describe("BudgetController — cost limit", () => {
  it("stops when cumulative cost exceeds budget", () => {
    const ctrl = new BudgetController(makeCostTracker("cost-test"), {
      maxBudgetUsd: 0.001,
      maxTurns: 100,
    });

    // gpt-4o: $2.50/Mtok input, $10/Mtok output
    // 1000 input + 500 output = $0.0025 + $0.005 = $0.0075
    // This exceeds $0.001 after the first step
    const decision = ctrl.checkBudget(makeStep());
    expect(decision).toBe("stop_cost");
    expect(ctrl.isStopped()).toBe(true);
    expect(ctrl.getLastDecision()).toBe("stop_cost");
  });
});

// ---------------------------------------------------------------------------
// Token limit enforcement
// ---------------------------------------------------------------------------

describe("BudgetController — token limits", () => {
  it("stops on input token limit (including cache tokens)", () => {
    const ctrl = new BudgetController(makeCostTracker("input-tok"), {
      maxInputTokens: 2000,
      maxTurns: 100,
      maxBudgetUsd: 100,
    });

    // First step: 1000 input + 0 cache = 1000 cumulative
    expect(ctrl.checkBudget(makeStep())).toBe("continue");

    // Second step: 1000 more input = 2000 cumulative — hits limit
    expect(ctrl.checkBudget(makeStep())).toBe("stop_tokens");
  });

  it("counts cache read and cache creation tokens toward input total", () => {
    const ctrl = new BudgetController(makeCostTracker("cache-tok"), {
      maxInputTokens: 1500,
      maxTurns: 100,
      maxBudgetUsd: 100,
    });

    // 500 input + 600 cache read + 500 cache creation = 1600 > 1500
    const decision = ctrl.checkBudget(
      makeStep({
        inputTokens: 500,
        cacheReadInputTokens: 600,
        cacheCreationInputTokens: 500,
      }),
    );
    expect(decision).toBe("stop_tokens");
  });

  it("stops on output token limit", () => {
    const ctrl = new BudgetController(makeCostTracker("output-tok"), {
      maxOutputTokens: 800,
      maxTurns: 100,
      maxBudgetUsd: 100,
      maxInputTokens: 10_000_000,
    });

    // First step: 500 output tokens
    expect(ctrl.checkBudget(makeStep())).toBe("continue");

    // Second step: 500 more = 1000 > 800
    expect(ctrl.checkBudget(makeStep())).toBe("stop_tokens");
  });
});

// ---------------------------------------------------------------------------
// Budget summary reporting
// ---------------------------------------------------------------------------

describe("BudgetController — summary", () => {
  let ctrl: BudgetController;

  beforeEach(() => {
    ctrl = new BudgetController(makeCostTracker("summary-test"), {
      maxTurns: 10,
      maxBudgetUsd: 1.0,
      maxInputTokens: 50_000,
      maxOutputTokens: 20_000,
    });
  });

  it("accumulates usage across multiple steps", () => {
    ctrl.checkBudget(makeStep({ inputTokens: 2000, outputTokens: 800 }));
    ctrl.checkBudget(makeStep({ inputTokens: 3000, outputTokens: 1200 }));

    const summary = ctrl.getBudgetSummary();
    expect(summary.turnsUsed).toBe(2);
    expect(summary.inputTokensUsed).toBe(5000);
    expect(summary.outputTokensUsed).toBe(2000);
    expect(summary.costUsedUsd).toBeGreaterThan(0);
  });

  it("computes utilization ratios correctly", () => {
    ctrl.checkBudget(makeStep({ inputTokens: 25_000, outputTokens: 10_000 }));

    const summary = ctrl.getBudgetSummary();
    expect(summary.turnUtilization).toBeCloseTo(0.1, 4); // 1/10
    expect(summary.inputTokenUtilization).toBeCloseTo(0.5, 4); // 25k/50k
    expect(summary.outputTokenUtilization).toBeCloseTo(0.5, 4); // 10k/20k
  });

  it("returns limits in the summary", () => {
    const summary = ctrl.getBudgetSummary();
    expect(summary.limits.maxTurns).toBe(10);
    expect(summary.limits.maxBudgetUsd).toBe(1.0);
  });

  it("reports lastDecision accurately", () => {
    expect(ctrl.getBudgetSummary().lastDecision).toBe("continue");

    // Exhaust turn limit
    for (let i = 0; i < 10; i++) {
      ctrl.checkBudget(makeStep({ inputTokens: 10, outputTokens: 5 }));
    }
    expect(ctrl.getBudgetSummary().lastDecision).toBe("stop_turns");
  });
});
