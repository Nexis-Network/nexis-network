"use client";

import { useEffect } from "react";
import type { AIEvent } from "@/lib/schema";
import { WorkbenchShell } from "@/components/artifacts/workbench-shell/workbench-shell";
import { useSandboxWorkbenchController } from "@/components/artifacts/use-sandbox-workbench-controller";
import {
  buildSandboxWorkbenchOverflowTabs,
  resolveSandboxWorkbenchDock,
  resolveSandboxWorkbenchMainContent,
  resolveSandboxWorkbenchRail,
} from "./sandbox-workbench-shell-sections";
import { useSandboxWorkbenchViewState } from "../../hooks/artifacts/use-sandbox-workbench-view-state";

type SandboxWorkbenchProps = {
  activeTool?: UntypedJson | null;
  activeEvent?: AIEvent | null;
  loading?: boolean;
  onCollapsePanel?: () => void;
  viewport?: "desktop" | "phone" | "tablet";
  onImmersiveChange?: (immersive: boolean) => void;
};

export function SandboxWorkbench({
  activeTool,
  activeEvent,
  loading = false,
  onImmersiveChange,
  viewport = "desktop",
}: SandboxWorkbenchProps) {
  const controller = useSandboxWorkbenchController({ activeTool, activeEvent });
  const viewState = useSandboxWorkbenchViewState({
    activeTab: controller.activeTab,
    hasContracts: controller.contractFiles.length > 0,
    hasFiles: controller.files.length > 0,
    hasPdf: Boolean(controller.pdfUrl || controller.pdfBase64),
    hasPolymarket: controller.hasPolymarket,
    hasPreview: controller.hasPreview,
    hasSimulator: controller.simulatorEntries.length > 0,
    hasTerminal: controller.hasTerminal,
    hasWeb: Boolean(controller.webUrl || controller.webHtml),
    onTabChange: controller.setActiveTab,
    viewport,
  });
  const workspaceLabel =
    controller.files[0]?.path.split("/")[0]?.toUpperCase() ?? "WORKSPACE";
  const statusLabel = loading
    ? "Running"
    : controller.error
      ? "Error"
      : controller.hasAnyArtifactData
        ? "Ready"
        : "Idle";

  useEffect(() => {
    onImmersiveChange?.(
      viewport === "phone" && viewState.activeCompactView !== "files",
    );
  }, [onImmersiveChange, viewState.activeCompactView, viewport]);

  return (
    <WorkbenchShell
      model={{
        key: controller.sandboxId ?? "sandbox-workbench",
        title: "Artifact Workbench",
        subtitle: controller.sandboxId ?? "sandbox",
        viewport,
        filesAction:
          viewport === "desktop" && controller.files.length > 0
            ? {
                id: "files",
                label: "Files",
                icon: "panel",
                active: viewState.activeMainView === "files",
                onSelect: () => viewState.selectMainView("files"),
                testId: "artifact-view-switch-files",
              }
            : undefined,
        primaryTabs:
          viewport === "desktop"
            ? [
                {
                  id: "preview",
                  label: "Preview",
                  icon: "preview",
                  active: viewState.activeMainView === "preview",
                  disabled: !controller.hasPreview,
                  onSelect: () => viewState.selectMainView("preview"),
                  testId: "artifact-view-switch-preview",
                },
                {
                  id: "code",
                  label: "Code",
                  icon: "code",
                  active: viewState.activeMainView === "code",
                  onSelect: () => viewState.selectMainView("code"),
                  testId: "artifact-view-switch-code",
                },
              ]
            : [],
        compactTabs:
          viewport === "desktop"
            ? []
            : [
                {
                  id: "files",
                  label: "Files",
                  icon: "files",
                  active: viewState.activeCompactView === "files",
                  disabled: controller.files.length === 0,
                  onSelect: () => viewState.selectCompactView("files"),
                  testId: "artifact-view-switch-files",
                },
                {
                  id: "code",
                  label: "Code",
                  icon: "code",
                  active: viewState.activeCompactView === "code",
                  onSelect: () => viewState.selectCompactView("code"),
                  testId: "artifact-view-switch-code",
                },
                {
                  id: "preview",
                  label: "Preview",
                  icon: "preview",
                  active: viewState.activeCompactView === "preview",
                  disabled: !controller.hasPreview,
                  onSelect: () => viewState.selectCompactView("preview"),
                  testId: "artifact-view-switch-preview",
                },
                {
                  id: "terminal",
                  label: "Terminal",
                  icon: "terminal",
                  active: viewState.activeCompactView === "terminal",
                  disabled: !controller.hasTerminal,
                  onSelect: () => viewState.selectCompactView("terminal"),
                  testId: "artifact-view-switch-terminal",
                },
              ],
        overflowTabs: buildSandboxWorkbenchOverflowTabs({
          controller,
          viewState,
          viewport,
        }),
        rail: resolveSandboxWorkbenchRail({
          controller,
          viewState,
          viewport,
          workspaceLabel,
        }),
        main: resolveSandboxWorkbenchMainContent({
          controller,
          loading,
          viewState,
          viewport,
        }),
        dock: resolveSandboxWorkbenchDock({
          controller,
          viewState,
          viewport,
        }),
        statusBar:
          viewport === "desktop"
            ? {
                left: [
                  { id: "status", label: statusLabel, icon: "status", tone: "default" },
                  {
                    id: "files",
                    label: `${controller.files.length} files`,
                    icon: "files",
                  },
                ],
                right: [
                  {
                    id: "view",
                    label: viewState.activeMainView,
                    icon: "keyboard",
                  },
                  ...(controller.sandboxId
                    ? [
                        {
                          id: "sandbox",
                          label: controller.sandboxId,
                          icon: "bell" as const,
                        },
                      ]
                    : []),
                ],
              }
            : undefined,
        showMobileBack:
          controller.files.length > 0 && viewState.activeCompactView !== "files",
        onMobileBack: () => viewState.selectCompactView("files"),
      }}
    />
  );
}
