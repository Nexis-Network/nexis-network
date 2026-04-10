import { describe, expect, it } from "vitest";

import {
  getSettingsHubById,
  getSettingsTabOrDefault,
  legacySettingsRouteMap,
  settingsRouteRegistry,
} from "./settings-route-registry";

describe("settings route registry", () => {
  it("has unique hub ids", () => {
    const ids = settingsRouteRegistry.map((hub) => hub.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique tab ids per hub", () => {
    for (const hub of settingsRouteRegistry) {
      const ids = hub.tabs.map((tab) => tab.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("falls back to default tab when an invalid tab is requested", () => {
    const fallback = getSettingsTabOrDefault("social", "invalid-tab");
    expect(fallback?.id).toBe("profile");
  });

  it("resolves explicit valid tabs", () => {
    const tab = getSettingsTabOrDefault("developer", "cache");
    expect(tab?.id).toBe("cache");
  });

  it("keeps legacy mappings pointed at canonical hubs", () => {
    const target = legacySettingsRouteMap["/settings/profile"];
    expect(target).toBe("/settings/social?tab=profile");
    expect(Object.keys(legacySettingsRouteMap).length).toBeGreaterThan(10);
  });

  it("returns the correct hub by id", () => {
    const hub = getSettingsHubById("workspace");
    expect(hub.href).toBe("/settings/workspace");
  });
});
