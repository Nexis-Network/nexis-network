import { describe, expect, test } from "vitest";

import {
  resolveCdpWalletAvatarSeed,
  resolveIconPreferenceFromMetadata,
  resolveUserAvatarSeed,
} from "@/lib/user/avatar-preferences";

describe("resolveIconPreferenceFromMetadata", () => {
  test("defaults to polycon when metadata is missing", () => {
    expect(resolveIconPreferenceFromMetadata(null)).toBe("polycon");
    expect(resolveIconPreferenceFromMetadata(undefined)).toBe("polycon");
  });

  test("supports top-level icon preference", () => {
    expect(resolveIconPreferenceFromMetadata({ iconPreference: "polycon" })).toBe("polycon");
    expect(resolveIconPreferenceFromMetadata({ iconPreference: "jazzicon" })).toBe("jazzicon");
    expect(resolveIconPreferenceFromMetadata({ iconPreference: "blockies" })).toBe("blockies");
  });

  test("supports nested profile icon preference", () => {
    expect(resolveIconPreferenceFromMetadata({ profile: { iconPreference: "blockies" } })).toBe("blockies");
  });

  test("maps legacy blockie preference to blockies", () => {
    expect(resolveIconPreferenceFromMetadata({ iconPreference: "blockie" })).toBe("blockies");
    expect(resolveIconPreferenceFromMetadata({ profile: { iconPreference: "blockie" } })).toBe("blockies");
  });

  test("falls back to polycon for invalid values", () => {
    expect(resolveIconPreferenceFromMetadata({ iconPreference: "unknown" })).toBe("polycon");
    expect(resolveIconPreferenceFromMetadata({ profile: { iconPreference: "unknown" } })).toBe("polycon");
  });
});

describe("resolveUserAvatarSeed", () => {
  test("prioritizes username", () => {
    expect(
      resolveUserAvatarSeed({
        username: "nexis",
        displayName: "Nexis User",
        email: "user@nexis.ai",
        userId: 42,
      }),
    ).toBe("nexis");
  });

  test("falls back through displayName, email, and user id", () => {
    expect(resolveUserAvatarSeed({ displayName: "Nexis User", email: "user@nexis.ai", userId: 42 })).toBe(
      "Nexis User",
    );
    expect(resolveUserAvatarSeed({ email: "user@nexis.ai", userId: 42 })).toBe("user@nexis.ai");
    expect(resolveUserAvatarSeed({ userId: 42 })).toBe("user-42");
  });

  test("uses provided fallback when no identity fields exist", () => {
    expect(resolveUserAvatarSeed({}, "fallback-seed")).toBe("fallback-seed");
  });
});

describe("resolveCdpWalletAvatarSeed", () => {
  test("uses wallet address when present", () => {
    expect(resolveCdpWalletAvatarSeed("0xabc123", "nexis", "evm")).toBe("0xabc123");
  });

  test("uses deterministic user seed + chain when wallet address is missing", () => {
    expect(resolveCdpWalletAvatarSeed(null, "nexis", "evm")).toBe("nexis:cdp:evm");
    expect(resolveCdpWalletAvatarSeed(undefined, "nexis", "solana")).toBe("nexis:cdp:solana");
  });
});
