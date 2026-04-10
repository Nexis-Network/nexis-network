import { describe, expect, test } from "vitest";

import {
  createDeterministicAvatarDataUrl,
  resolveAvatarImageSrc,
} from "@/lib/avatar-image-fallback";

describe("createDeterministicAvatarDataUrl", () => {
  test("is deterministic for the same seed", () => {
    const first = createDeterministicAvatarDataUrl("agent-alpha");
    const second = createDeterministicAvatarDataUrl("agent-alpha");
    expect(first).toBe(second);
  });

  test("produces different values for different seeds", () => {
    const first = createDeterministicAvatarDataUrl("agent-alpha");
    const second = createDeterministicAvatarDataUrl("agent-beta");
    expect(first).not.toBe(second);
  });

  test("returns a data uri", () => {
    const value = createDeterministicAvatarDataUrl("agent-alpha");
    expect(value.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  });
});

describe("resolveAvatarImageSrc", () => {
  test("returns existing non-orb URL unchanged", () => {
    const src = "https://cdn.example.com/avatar.png";
    expect(resolveAvatarImageSrc(src, "agent-alpha")).toBe(src);
  });

  test("falls back for null and orb sources", () => {
    const fromNull = resolveAvatarImageSrc(null, "agent-alpha");
    const fromOrb = resolveAvatarImageSrc("orb:#111,#222", "agent-alpha");

    expect(fromNull.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(fromOrb.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(fromNull).toBe(fromOrb);
  });
});
