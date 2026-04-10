import { describe, expect, it } from "vitest";

import type { ConversationMessage } from "@/components/dashboard/chat-types";

import { deriveComposerTaskState } from "./task-status-state";

function createAssistantMessage(args: {
  status?: ConversationMessage["status"];
  parts: NonNullable<ConversationMessage["parts"]>;
}): ConversationMessage {
  return {
    id: "assistant-message",
    role: "assistant",
    status: args.status ?? "ready",
    parts: args.parts,
    thoughts: [],
    sources: [],
  };
}

describe("deriveComposerTaskState", () => {
  it("hides internal bootstrap task labels in the preview", () => {
    const state = deriveComposerTaskState({
      chatStatus: "streaming",
      messages: [
        createAssistantMessage({
          parts: [
            {
              type: "data-task",
              data: {
                id: "context_build",
                title: "Context build",
                status: "done",
              },
            },
            {
              type: "data-task",
              data: {
                id: "prompt_build",
                title: "Prompt build",
                description: "25% complete",
                status: "in_progress",
              },
            },
          ],
        }),
      ],
    });

    expect(state).not.toBeNull();
    expect(state?.tone).toBe("working");
    expect(state?.currentTaskId).toBe("prompt_build");
    expect(state?.previewText).toBe("Preparing response");
    expect(state?.tasks[0]?.id).toBe("prompt_build");
    expect(state?.tasks[0]?.title).toBe("Preparing response");
    expect(state?.tasks[0]?.detailText).toBe("Preparing the response.");
  });

  it("marks active recovery work as an issue", () => {
    const state = deriveComposerTaskState({
      chatStatus: "streaming",
      messages: [
        createAssistantMessage({
          parts: [
            {
              type: "data-task",
              data: {
                id: "research",
                title: "Research sources",
                status: "error",
              },
            },
            {
              type: "data-task",
              data: {
                id: "retry",
                title: "Retry source fetch",
                status: "in_progress",
              },
            },
          ],
        }),
      ],
    });

    expect(state?.tone).toBe("issue");
  });

  it("prefers user-relevant task labels when real task work is active", () => {
    const state = deriveComposerTaskState({
      chatStatus: "streaming",
      messages: [
        createAssistantMessage({
          parts: [
            {
              type: "data-task",
              data: {
                id: "context_build",
                title: "Context build",
                status: "done",
              },
            },
            {
              type: "data-task",
              data: {
                id: "research",
                title: "Research sources",
                description: "Checking the latest filings",
                status: "in_progress",
              },
            },
          ],
        }),
      ],
    });

    expect(state?.currentTaskId).toBe("research");
    expect(state?.previewText).toBe("Research sources Checking the latest filings");
    expect(state?.tasks).toHaveLength(1);
    expect(state?.tasks[0]?.title).toBe("Research sources");
  });

  it("clears finished task lists once chat returns to ready", () => {
    const state = deriveComposerTaskState({
      chatStatus: "ready",
      messages: [
        createAssistantMessage({
          parts: [
            {
              type: "data-task",
              data: {
                id: "context_build",
                title: "Context build",
                status: "done",
              },
            },
            {
              type: "data-task",
              data: {
                id: "prompt_build",
                title: "Prompt build",
                status: "done",
              },
            },
          ],
        }),
      ],
    });

    expect(state).toBeNull();
  });

  it("marks terminal failures as errors", () => {
    const state = deriveComposerTaskState({
      chatStatus: "error",
      messages: [
        createAssistantMessage({
          status: "error",
          parts: [
            {
              type: "data-task",
              data: {
                id: "context_build",
                title: "Context build",
                status: "error",
              },
            },
          ],
        }),
      ],
    });

    expect(state?.tone).toBe("error");
  });
});
