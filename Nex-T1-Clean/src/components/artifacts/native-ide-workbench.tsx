"use client";

import { WorkbenchShell } from "@/components/artifacts/workbench-shell/workbench-shell";
import type { NativeIdeSessionData } from "@/modules/chat/ui-message-parts";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  NativeIdeWorkbenchExplorer,
  NativeIdeWorkbenchLogs,
  NativeIdeWorkbenchMain,
  NativeIdeWorkbenchTerminalDock,
} from "./native-ide-workbench-panels";
import { sanitizeNativeIdeSession } from "./native-ide-workbench.utils";
import { useNativeIdeWorkbenchState } from "../../hooks/artifacts/use-native-ide-workbench-state";

export type NativeIdeWorkbenchProps = {
  session: NativeIdeSessionData;
  className?: string;
};

export function NativeIdeWorkbench({
  session,
  className,
}: NativeIdeWorkbenchProps) {
  const sanitizedSession = useMemo(
    () => sanitizeNativeIdeSession(session),
    [session],
  );
  const {
    activeDockTab,
    activeMainView,
    selectedPath,
    setActiveDockTab,
    setActiveMainView,
    setSelectedPath,
  } = useNativeIdeWorkbenchState({
    session: sanitizedSession,
    viewport: "desktop",
  });
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const statusLabel =
    sanitizedSession.status === "running"
      ? "Running"
      : sanitizedSession.status === "error"
        ? "Error"
        : "Ready";
  const workspaceLabel = useMemo(() => {
    const firstPath = sanitizedSession.files[0]?.path;
    return firstPath?.split("/")[0]?.toUpperCase() ?? "WORKSPACE";
  }, [sanitizedSession.files]);
  const hasPreview = Boolean(
    sanitizedSession.jsxPreview ||
      sanitizedSession.previewUrl ||
      sanitizedSession.previewHtml,
  );
  const hasTerminal = Boolean(sanitizedSession.terminal);
  const hasTests = Boolean(sanitizedSession.testResults?.items?.length);

  return (
    <WorkbenchShell
      className={cn("h-full", className)}
      model={{
        key:
          sanitizedSession.artifactId ??
          sanitizedSession.sandboxId ??
          sanitizedSession.conversationId ??
          sanitizedSession.title ??
          "__ide-session__",
        title: sanitizedSession.title ?? "Artifact Workbench",
        subtitle: sanitizedSession.mode ?? "code",
        viewport: "desktop",
        filesAction: {
          id: "files",
          label: "Files",
          icon: "panel",
          active: activeMainView === "files",
          onSelect: () => setActiveMainView("files"),
          testId: "artifact-view-switch-files",
        },
        primaryTabs: [
          {
            id: "preview",
            label: "Preview",
            icon: "preview",
            active: activeMainView === "preview",
            disabled: !hasPreview,
            onSelect: () => setActiveMainView("preview"),
            testId: "artifact-view-switch-preview",
          },
          {
            id: "code",
            label: "Code",
            icon: "code",
            active: activeMainView === "code",
            onSelect: () => setActiveMainView("code"),
            testId: "artifact-view-switch-code",
          },
        ],
        compactTabs: [],
        overflowTabs: hasTests
          ? [
              {
                id: "tests",
                label: "Tests",
                icon: "tests",
                active: activeMainView === "tests",
                onSelect: () => setActiveMainView("tests"),
                testId: "artifact-overflow-item-tests",
              },
            ]
          : [],
        rail:
          sanitizedSession.files.length > 0
            ? {
                title: workspaceLabel,
                actions: [
                  {
                    id: "explorer",
                    label: "Explorer",
                    icon: "explorer",
                    active: true,
                    onSelect: () => undefined,
                  },
                  {
                    id: "search",
                    label: "Search",
                    icon: "search",
                    onSelect: () => undefined,
                  },
                  {
                    id: "extensions",
                    label: "Extensions",
                    icon: "extensions",
                    onSelect: () => undefined,
                  },
                ],
                content: (
                  <NativeIdeWorkbenchExplorer
                    session={sanitizedSession}
                    selectedPath={selectedPath}
                    onSelectPath={setSelectedPath}
                    onOpenCode={() => setActiveMainView("code")}
                  />
                ),
              }
            : null,
        main: (
          <NativeIdeWorkbenchMain
            activeView={activeMainView}
            selectedPath={selectedPath}
            session={sanitizedSession}
          />
        ),
        dock:
          hasTerminal || sanitizedSession.plan?.length || sanitizedSession.queue
            ? {
                collapsed: dockCollapsed,
                onToggleCollapse: () => setDockCollapsed((current) => !current),
                tabs: [
                  {
                    id: "logs",
                    label: "Logs",
                    icon: "logs",
                    active: activeDockTab === "logs",
                    onSelect: () => setActiveDockTab("logs"),
                    testId: "artifact-view-switch-logs",
                  },
                  {
                    id: "terminal",
                    label: "Terminal",
                    icon: "terminal",
                    active: activeDockTab === "terminal",
                    disabled: !hasTerminal,
                    onSelect: () => setActiveDockTab("terminal"),
                    testId: "artifact-view-switch-terminal",
                  },
                ],
                content:
                  activeDockTab === "terminal" && hasTerminal ? (
                    <NativeIdeWorkbenchTerminalDock session={sanitizedSession} />
                  ) : (
                    <NativeIdeWorkbenchLogs session={sanitizedSession} />
                  ),
              }
            : null,
        statusBar: {
          left: [
            { id: "status", label: statusLabel, icon: "status", tone: "default" },
            {
              id: "files",
              label: `${sanitizedSession.files.length} files`,
              icon: "files",
            },
          ],
          right: [
            ...(sanitizedSession.mode
              ? [
                  {
                    id: "mode",
                    label: sanitizedSession.mode,
                    icon: "keyboard" as const,
                  },
                ]
              : []),
            ...(sanitizedSession.sandboxId
              ? [
                  {
                    id: "sandbox",
                    label: sanitizedSession.sandboxId,
                    icon: "bell" as const,
                  },
                ]
              : []),
          ],
        },
      }}
    />
  );
}
