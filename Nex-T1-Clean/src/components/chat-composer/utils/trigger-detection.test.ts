import { describe, expect, it } from "vitest";

import {
  findComposerTriggerMatch,
  resolveComposerTriggerAtCursor,
} from "@/components/chat-composer/utils/trigger-detection";

describe("resolveComposerTriggerAtCursor", () => {
  it("detects slash at the caret position", () => {
    expect(
      resolveComposerTriggerAtCursor({
        value: "/",
        selectionStart: 1,
      }),
    ).toBe("/");
  });

  it("detects @ at the caret position without rejecting shift-generated input", () => {
    expect(
      resolveComposerTriggerAtCursor({
        value: "@",
        selectionStart: 1,
      }),
    ).toBe("@");
  });

  it("ignores modified shortcuts that should not open a composer popup", () => {
    expect(
      resolveComposerTriggerAtCursor({
        value: "@",
        selectionStart: 1,
        metaKey: true,
      }),
    ).toBeNull();
  });
});

describe("findComposerTriggerMatch", () => {
  it("only matches triggers at the start of a word", () => {
    expect(findComposerTriggerMatch("hello@", 6, "@")).toBeNull();
    expect(findComposerTriggerMatch("hello @", 7, "@")).toEqual({
      trigger: "@",
      triggerIndex: 6,
      insertionIndex: 6,
    });
  });
});
