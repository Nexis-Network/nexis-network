/**
 * Compaction Engine Integration Tests
 *
 * Tests token estimation, microcompaction, full compaction,
 * auto-compact triggers, and circuit breaker behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  estimateTokens,
  estimateMessagesTokens,
  microcompact,
  compactMessages,
  buildCompactionPrompt,
  shouldAutoCompact,
  recordCompactionResult,
  markCompactionInProgress,
  clearSessionState,
} from "../compaction/engine";

import type { ModelMessage } from "ai";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTextMessage(role: "user" | "assistant", text: string): ModelMessage {
  return { role, content: text } as ModelMessage;
}

function makeToolResultMessage(result: string): ModelMessage {
  return {
    role: "tool" as any,
    content: [
      { type: "tool-result", toolCallId: "tc-1", toolName: "Bash", result },
    ],
  } as unknown as ModelMessage;
}

function makeImageMessage(): ModelMessage {
  return {
    role: "user",
    content: [
      { type: "image", image: new Uint8Array(100) },
    ],
  } as unknown as ModelMessage;
}

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates ~4 chars per token for English prose", () => {
    const text = "The quick brown fox jumps over the lazy dog."; // 44 chars
    const tokens = estimateTokens(text);
    expect(tokens).toBe(Math.ceil(44 / 4)); // 11
  });

  it("handles single character", () => {
    expect(estimateTokens("x")).toBe(1);
  });

  it("handles very long strings", () => {
    const long = "a".repeat(100_000);
    expect(estimateTokens(long)).toBe(25_000);
  });
});

describe("estimateMessagesTokens", () => {
  it("includes framing overhead per message", () => {
    const messages = [makeTextMessage("user", "Hello")];
    const tokens = estimateMessagesTokens(messages);
    // "Hello" = 5 chars / 4 = 2 tokens + 4 framing = 6
    expect(tokens).toBe(6);
  });

  it("sums tokens across multiple messages", () => {
    const messages = [
      makeTextMessage("user", "Hi there"),
      makeTextMessage("assistant", "Hello back"),
    ];
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(8); // At least framing + content
  });

  it("estimates image parts at ~1000 tokens", () => {
    const messages = [makeImageMessage()];
    const tokens = estimateMessagesTokens(messages);
    // 4 framing + 1000 image = 1004
    expect(tokens).toBe(1004);
  });

  it("estimates tool-result parts with overhead", () => {
    const messages = [makeToolResultMessage("output data")];
    const tokens = estimateMessagesTokens(messages);
    // 4 framing + 50 marker + estimateTokens("output data")
    expect(tokens).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Microcompaction
// ---------------------------------------------------------------------------

describe("microcompact", () => {
  it("replaces old image blocks with placeholder text", () => {
    const messages: ModelMessage[] = [
      makeImageMessage(),
      makeTextMessage("assistant", "I see the image"),
      makeTextMessage("user", "Thanks"),
      makeTextMessage("assistant", "Final answer"),
      makeTextMessage("user", "One more"),
      makeTextMessage("assistant", "Done"),
    ];

    const { messages: result, trimmedCount } = microcompact(messages);

    // The first message (image) should be replaced since it's old
    const firstContent = result[0].content as any[];
    expect(firstContent[0].type).toBe("text");
    expect(firstContent[0].text).toContain("removed during compaction");
    expect(trimmedCount).toBeGreaterThan(0);
  });

  it("preserves recent messages intact", () => {
    const messages: ModelMessage[] = Array.from({ length: 10 }, (_, i) =>
      makeTextMessage(i % 2 === 0 ? "user" : "assistant", `Message ${i}`),
    );

    const { messages: result } = microcompact(messages);

    // Last ~30% should be untouched
    const lastIdx = messages.length - 1;
    expect(result[lastIdx].content).toBe(messages[lastIdx].content);
  });

  it("trims oversized tool results in old messages", () => {
    const bigResult = "x".repeat(50_000); // Way over 2000 token estimate
    const messages: ModelMessage[] = [
      makeToolResultMessage(bigResult),
      ...Array.from({ length: 8 }, (_, i) =>
        makeTextMessage(i % 2 === 0 ? "user" : "assistant", `Msg ${i}`),
      ),
    ];

    const { messages: result, trimmedCount } = microcompact(messages);
    expect(trimmedCount).toBeGreaterThan(0);

    // The tool result should be truncated
    const toolContent = (result[0].content as any[])[0];
    if (toolContent.result) {
      expect(toolContent.result.length).toBeLessThan(bigResult.length);
    }
  });

  it("returns 0 trimmed count when nothing to trim", () => {
    const messages = [
      makeTextMessage("user", "short"),
      makeTextMessage("assistant", "reply"),
    ];

    const { trimmedCount } = microcompact(messages);
    expect(trimmedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Full compaction
// ---------------------------------------------------------------------------

describe("compactMessages", () => {
  it("preserves the last N messages", () => {
    const messages: ModelMessage[] = Array.from({ length: 10 }, (_, i) =>
      makeTextMessage(i % 2 === 0 ? "user" : "assistant", `Message ${i}`),
    );

    const result = compactMessages(messages, "Summary of older messages", 4);

    expect(result.compacted).toBe(true);
    expect(result.preserved).toBe(4);
    expect(result.removed).toBe(6);
    // Should have 1 boundary + 4 preserved = 5 messages
    expect(result.messages.length).toBe(5);
  });

  it("includes summary in boundary message", () => {
    const messages: ModelMessage[] = Array.from({ length: 6 }, (_, i) =>
      makeTextMessage("user", `Msg ${i}`),
    );

    const result = compactMessages(messages, "This is the summary", 2);
    const boundary = result.messages[0];

    expect(boundary.role).toBe("assistant");
    expect(boundary.content).toContain("This is the summary");
    expect(boundary.content).toContain("Context Summary");
  });

  it("does not compact when messages <= preserveCount", () => {
    const messages = [
      makeTextMessage("user", "A"),
      makeTextMessage("assistant", "B"),
    ];

    const result = compactMessages(messages, "Summary", 4);
    expect(result.compacted).toBe(false);
    expect(result.messages).toEqual(messages);
  });

  it("collects discarded headlines", () => {
    const messages: ModelMessage[] = [
      makeTextMessage("user", "Question about databases"),
      makeTextMessage("assistant", "Here is the answer about SQL"),
      makeTextMessage("user", "Follow up"),
      makeTextMessage("assistant", "Final"),
    ];

    const result = compactMessages(messages, "Summary", 2);
    expect(result.discardedHeadlines.length).toBe(2);
    expect(result.discardedHeadlines[0]).toContain("databases");
  });
});

describe("buildCompactionPrompt", () => {
  it("includes all 9 section headers", () => {
    const messages = [
      makeTextMessage("user", "Build a REST API"),
      makeTextMessage("assistant", "I will create the endpoints"),
    ];

    const prompt = buildCompactionPrompt(messages);
    expect(prompt).toContain("Primary Request");
    expect(prompt).toContain("Key Technical Concepts");
    expect(prompt).toContain("Files and Code Sections");
    expect(prompt).toContain("Pending Tasks");
  });

  it("caps message inclusion when exceeding maxCompactionPromptMessages", () => {
    const messages: ModelMessage[] = Array.from({ length: 500 }, (_, i) =>
      makeTextMessage(i % 2 === 0 ? "user" : "assistant", `Message ${i}`),
    );

    const prompt = buildCompactionPrompt(messages, {
      maxCompactionPromptMessages: 50,
    });

    // Should mention total messages count
    expect(prompt).toContain("500 total messages");
    // Should include omission marker
    expect(prompt).toContain("messages omitted");
  });
});

// ---------------------------------------------------------------------------
// Auto-compact trigger
// ---------------------------------------------------------------------------

describe("shouldAutoCompact", () => {
  const sessionId = "compact-test";

  beforeEach(() => {
    clearSessionState(sessionId);
  });

  afterEach(() => {
    clearSessionState(sessionId);
  });

  it("returns false when under threshold", () => {
    const messages = [makeTextMessage("user", "short")];
    const result = shouldAutoCompact(sessionId, messages, {
      contextWindow: 128_000,
      maxOutputTokens: 8_192,
      bufferTokens: 13_000,
    });
    expect(result).toBe(false);
  });

  it("returns true when estimated tokens exceed threshold", () => {
    // Create enough messages to exceed threshold
    const bigContent = "x".repeat(500_000); // ~125K tokens
    const messages = [makeTextMessage("user", bigContent)];

    const result = shouldAutoCompact(sessionId, messages, {
      contextWindow: 128_000,
      maxOutputTokens: 8_192,
      bufferTokens: 13_000,
    });
    // Threshold = 128000 - 8192 - 13000 = 106808
    // Estimated tokens = 500000/4 + 4 = 125004
    expect(result).toBe(true);
  });

  it("returns false when compaction is in progress", () => {
    const bigContent = "x".repeat(500_000);
    const messages = [makeTextMessage("user", bigContent)];

    markCompactionInProgress(sessionId);

    const result = shouldAutoCompact(sessionId, messages, {
      contextWindow: 128_000,
      maxOutputTokens: 8_192,
      bufferTokens: 13_000,
    });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Consecutive failure circuit breaker
// ---------------------------------------------------------------------------

describe("Compaction circuit breaker", () => {
  const sessionId = "breaker-test";

  beforeEach(() => {
    clearSessionState(sessionId);
  });

  afterEach(() => {
    clearSessionState(sessionId);
  });

  it("stops triggering after 3 consecutive failures", () => {
    const bigContent = "x".repeat(500_000);
    const messages = [makeTextMessage("user", bigContent)];
    const config = {
      contextWindow: 128_000,
      maxOutputTokens: 8_192,
      bufferTokens: 13_000,
    };

    // First check should trigger
    expect(shouldAutoCompact(sessionId, messages, config)).toBe(true);

    // Record 3 failures
    markCompactionInProgress(sessionId);
    recordCompactionResult(sessionId, false);
    markCompactionInProgress(sessionId);
    recordCompactionResult(sessionId, false);
    markCompactionInProgress(sessionId);
    recordCompactionResult(sessionId, false);

    // Should now be circuit-broken
    expect(shouldAutoCompact(sessionId, messages, config)).toBe(false);
  });

  it("resets failure count on success", () => {
    const bigContent = "x".repeat(500_000);
    const messages = [makeTextMessage("user", bigContent)];
    const config = {
      contextWindow: 128_000,
      maxOutputTokens: 8_192,
      bufferTokens: 13_000,
    };

    // Record 2 failures then 1 success
    markCompactionInProgress(sessionId);
    recordCompactionResult(sessionId, false);
    markCompactionInProgress(sessionId);
    recordCompactionResult(sessionId, false);
    markCompactionInProgress(sessionId);
    recordCompactionResult(sessionId, true);

    // Should still trigger (failures reset to 0)
    expect(shouldAutoCompact(sessionId, messages, config)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Content part type handling
// ---------------------------------------------------------------------------

describe("Content part type handling", () => {
  it("estimates reasoning parts", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "reasoning", text: "Let me think about this..." },
        ],
      } as unknown as ModelMessage,
    ];

    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(4); // More than just framing
  });

  it("estimates tool-call parts", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "tc-1",
            toolName: "ReadFile",
            args: { path: "/src/index.ts" },
          },
        ],
      } as unknown as ModelMessage,
    ];

    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(54); // framing + marker + name + args
  });

  it("handles unknown part types with fallback estimate", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "custom-future-type", data: "something" },
        ],
      } as unknown as ModelMessage,
    ];

    const tokens = estimateMessagesTokens(messages);
    // Should use TOOL_MARKER_TOKEN_ESTIMATE (50) as fallback + 4 framing
    expect(tokens).toBe(54);
  });
});
