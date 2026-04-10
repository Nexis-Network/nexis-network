import { describe, expect, it } from "vitest";

import {
  APP_CHAT_SHELL_CHROME_POSITIONS,
  getDesktopArtifactPanelSizing,
  shouldHideAppDashboardFooter,
} from "@/components/dashboard/app-chat-shell-layout";

describe("app chat shell layout helpers", () => {
  it("anchors ETH and gas pills to opposite bottom corners of the workspace", () => {
    expect(APP_CHAT_SHELL_CHROME_POSITIONS.ethPrice).toContain("left-[var(--auth-shell-padding-x)]");
    expect(APP_CHAT_SHELL_CHROME_POSITIONS.ethPrice).not.toContain("right-[var(--auth-shell-padding-x)]");
    expect(APP_CHAT_SHELL_CHROME_POSITIONS.gasPrice).toContain("right-[var(--auth-shell-padding-x)]");
    expect(APP_CHAT_SHELL_CHROME_POSITIONS.gasPrice).not.toContain("left-[var(--auth-shell-padding-x)]");
  });

  it("returns bounded desktop panel sizing for the resizable chat layout", () => {
    const sizing = getDesktopArtifactPanelSizing();

    expect(sizing.autoSaveId).toBe("app-chat-desktop-panels");
    expect(sizing.chatDefaultSize).toBeGreaterThan(sizing.panelDefaultSize);
    expect(sizing.chatMinSize).toBeLessThan(100);
    expect(sizing.panelMinSize).toBeLessThan(sizing.panelDefaultSize);
    expect(sizing.panelDefaultSize).toBeLessThan(sizing.panelMaxSize);
  });

  it("hides the footer when the artifact panel is open or a document is active", () => {
    expect(
      shouldHideAppDashboardFooter({
        activeRightPanelMode: "workbench",
        openedDocumentId: null,
        rightPanelIsCollapsed: false,
        rightPanelIsOpen: true,
      }),
    ).toBe(true);

    expect(
      shouldHideAppDashboardFooter({
        activeRightPanelMode: "workbench",
        openedDocumentId: "doc_123",
        rightPanelIsCollapsed: true,
        rightPanelIsOpen: false,
      }),
    ).toBe(true);
  });
});
