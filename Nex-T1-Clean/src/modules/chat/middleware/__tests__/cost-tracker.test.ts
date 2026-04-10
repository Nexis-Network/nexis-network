/**
 * Cost Tracker Integration Tests
 *
 * Tests cost calculation accuracy, per-model usage accumulation,
 * cache hit rate, session lifecycle, token validation, and eviction.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  calculateCost,
  getPricing,
  SessionCostTracker,
  getOrCreateSessionTracker,
  getSessionCostSummary,
  clearSessionTracker,
  getActiveSessionCount,
} from "../cost-tracker";


// ---------------------------------------------------------------------------
// Pricing resolution
// ---------------------------------------------------------------------------

describe("getPricing", () => {
  it("returns exact match for known model ID", () => {
    const pricing = getPricing("gpt-4o");
    expect(pricing.inputPerMtok).toBe(2.5);
    expect(pricing.outputPerMtok).toBe(10);
  });

  it("strips gateway prefix and matches (openai/gpt-4o-mini)", () => {
    const pricing = getPricing("openai/gpt-4o-mini");
    expect(pricing.inputPerMtok).toBe(0.15);
    expect(pricing.outputPerMtok).toBe(0.6);
  });

  it("matches longer prefix before shorter (gpt-4o-mini before gpt-4o)", () => {
    const mini = getPricing("gpt-4o-mini-2024-11-20");
    const full = getPricing("gpt-4o-2024-11-20");

    // gpt-4o-mini should be $0.15 input, not $2.50
    expect(mini.inputPerMtok).toBe(0.15);
    expect(full.inputPerMtok).toBe(2.5);
  });

  it("returns default pricing for unknown model", () => {
    const pricing = getPricing("totally-unknown-model");
    expect(pricing.inputPerMtok).toBe(3);
    expect(pricing.outputPerMtok).toBe(15);
  });

  it("handles provider-prefixed unknown model", () => {
    const pricing = getPricing("custom-provider/unknown-model");
    expect(pricing.inputPerMtok).toBe(3);
  });

  it("resolves Anthropic model pricing", () => {
    const pricing = getPricing("claude-opus-4-6");
    expect(pricing.inputPerMtok).toBe(5);
    expect(pricing.outputPerMtok).toBe(25);
  });

  it("resolves Google model pricing", () => {
    const pricing = getPricing("gemini-2.5-flash");
    expect(pricing.inputPerMtok).toBe(0.15);
  });
});

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

describe("calculateCost", () => {
  it("computes correct cost for known token counts", () => {
    // 1M input tokens at $2.5/Mtok = $2.50
    const cost = calculateCost("gpt-4o", 1_000_000, 0, 0, 0);
    expect(cost).toBeCloseTo(2.5, 4);
  });

  it("includes all four token categories in cost", () => {
    const cost = calculateCost(
      "gpt-4o",
      100_000,  // input: 100K * 2.5/1M = $0.25
      50_000,   // output: 50K * 10/1M = $0.50
      200_000,  // cache read: 200K * 1.25/1M = $0.25
      10_000,   // cache creation: 10K * 2.5/1M = $0.025
    );
    expect(cost).toBeCloseTo(0.25 + 0.50 + 0.25 + 0.025, 4);
  });

  it("returns 0 for zero tokens", () => {
    expect(calculateCost("gpt-4o", 0, 0, 0, 0)).toBe(0);
  });

  it("sanitizes NaN token counts to 0", () => {
    const cost = calculateCost("gpt-4o", NaN, 100, NaN, 0);
    // Only 100 output tokens should count
    const expected = (100 / 1_000_000) * 10;
    expect(cost).toBeCloseTo(expected, 8);
  });

  it("sanitizes negative token counts to 0", () => {
    const cost = calculateCost("gpt-4o", -500, 100, 0, 0);
    const expected = (100 / 1_000_000) * 10;
    expect(cost).toBeCloseTo(expected, 8);
  });

  it("sanitizes Infinity token counts to 0", () => {
    const cost = calculateCost("gpt-4o", Infinity, 0, 0, 0);
    expect(cost).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Session cost tracker
// ---------------------------------------------------------------------------

describe("SessionCostTracker", () => {
  let tracker: SessionCostTracker;

  beforeEach(() => {
    tracker = new SessionCostTracker("test-session");
  });

  it("records a turn and returns usage with cost", () => {
    const turn = tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 1000,
      outputTokens: 500,
      durationMs: 200,
    });

    expect(turn.model).toBe("gpt-4o");
    expect(turn.inputTokens).toBe(1000);
    expect(turn.outputTokens).toBe(500);
    expect(turn.costUsd).toBeGreaterThan(0);
    expect(turn.turnNumber).toBe(1);
  });

  it("accumulates usage across multiple turns", () => {
    tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 1000,
      outputTokens: 500,
      durationMs: 100,
    });
    tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 2000,
      outputTokens: 1000,
      durationMs: 150,
    });

    const summary = tracker.getSummary();
    expect(summary.totalInputTokens).toBe(3000);
    expect(summary.totalOutputTokens).toBe(1500);
    expect(summary.turnCount).toBe(2);
  });

  it("tracks per-model breakdown with multiple models", () => {
    tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 1000,
      outputTokens: 500,
      durationMs: 100,
    });
    tracker.recordTurn({
      model: "gpt-4o-mini",
      inputTokens: 5000,
      outputTokens: 2000,
      durationMs: 80,
    });

    const summary = tracker.getSummary();
    expect(Object.keys(summary.modelBreakdown)).toHaveLength(2);
    expect(summary.modelBreakdown["gpt-4o"]!.inputTokens).toBe(1000);
    expect(summary.modelBreakdown["gpt-4o-mini"]!.inputTokens).toBe(5000);
  });

  it("computes cache hit rate correctly", () => {
    tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadInputTokens: 800,
      cacheCreationInputTokens: 200,
      durationMs: 100,
    });

    const summary = tracker.getSummary();
    // 800 reads / (800 reads + 200 creations) = 0.8
    expect(summary.cacheHitRate).toBeCloseTo(0.8, 4);
  });

  it("returns 0 cache hit rate when no cache activity", () => {
    tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 1000,
      outputTokens: 500,
      durationMs: 100,
    });

    const summary = tracker.getSummary();
    expect(summary.cacheHitRate).toBe(0);
  });

  it("sanitizes NaN/negative durationMs", () => {
    const turn = tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 50,
      durationMs: -500,
    });
    expect(turn.durationMs).toBe(0);

    const turn2 = tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 50,
      durationMs: NaN,
    });
    expect(turn2.durationMs).toBe(0);
  });

  it("floors fractional token counts", () => {
    const turn = tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 100.7,
      outputTokens: 50.3,
      durationMs: 100,
    });
    expect(turn.inputTokens).toBe(100);
    expect(turn.outputTokens).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Session management (create, get, clear)
// ---------------------------------------------------------------------------

describe("Session management", () => {
  const sessionIds = ["mgmt-test-1", "mgmt-test-2", "count-test-a", "count-test-b"];

  beforeEach(() => {
    for (const id of sessionIds) clearSessionTracker(id);
  });

  afterEach(() => {
    for (const id of sessionIds) clearSessionTracker(id);
  });

  it("creates and retrieves a session tracker", () => {
    const tracker = getOrCreateSessionTracker("mgmt-test-1");
    expect(tracker.sessionId).toBe("mgmt-test-1");

    // Get the same tracker on second call
    const same = getOrCreateSessionTracker("mgmt-test-1");
    expect(same).toBe(tracker);
  });

  it("returns null summary for unknown session", () => {
    const summary = getSessionCostSummary("nonexistent-session");
    expect(summary).toBeNull();
  });

  it("returns summary after recording turns", () => {
    const tracker = getOrCreateSessionTracker("mgmt-test-2");
    tracker.recordTurn({
      model: "gpt-4o",
      inputTokens: 500,
      outputTokens: 200,
      durationMs: 50,
    });

    const summary = getSessionCostSummary("mgmt-test-2");
    expect(summary).not.toBeNull();
    expect(summary!.totalInputTokens).toBe(500);
    expect(summary!.sessionId).toBe("mgmt-test-2");
  });

  it("clears session tracker", () => {
    getOrCreateSessionTracker("mgmt-test-1");
    clearSessionTracker("mgmt-test-1");

    const summary = getSessionCostSummary("mgmt-test-1");
    expect(summary).toBeNull();
  });

  it("reports active session count", () => {
    const before = getActiveSessionCount();
    getOrCreateSessionTracker("count-test-a");
    getOrCreateSessionTracker("count-test-b");

    expect(getActiveSessionCount()).toBeGreaterThanOrEqual(before + 2);

    clearSessionTracker("count-test-a");
    clearSessionTracker("count-test-b");
  });
});
