"use client";

import { cn } from "@/lib/utils";
import type { NativeIdeSessionData } from "@/modules/chat/ui-message-parts";
import { useEffect, useMemo } from "react";
import { WorkbenchShell } from "@/components/artifacts/workbench-shell/workbench-shell";
import { useNativeIdeWorkbenchState } from "../../hooks/artifacts/use-native-ide-workbench-state";
import {
  NativeIdeWorkbenchExplorer,
  NativeIdeWorkbenchLogs,
  NativeIdeWorkbenchMain,
  NativeIdeWorkbenchTerminalDock,
} from "./native-ide-workbench-panels";
import { sanitizeNativeIdeSession } from "./native-ide-workbench.utils";

type MobileIdeWorkbenchProps = {
  session: NativeIdeSessionData;
  viewport: "phone" | "tablet";
  className?: string;
  onImmersiveChange?: (immersive: boolean) => void;
};

export function MobileIdeWorkbench({
  session,
  viewport,
  className,
  onImmersiveChange,
}: MobileIdeWorkbenchProps) {
  const sanitizedSession = useMemo(
    () => sanitizeNativeIdeSession(session),
    [session],
  );
  const {
    activeCompactView,
    selectedPath,
    setActiveCompactView,
    setSelectedPath,
  } = useNativeIdeWorkbenchState({
    session: sanitizedSession,
    viewport,
  });
  const hasPreview = Boolean(
    sanitizedSession.jsxPreview ||
      sanitizedSession.previewUrl ||
      sanitizedSession.previewHtml,
  );
  const hasTerminal = Boolean(sanitizedSession.terminal);
  const hasTests = Boolean(sanitizedSession.testResults?.items?.length);
  const hasLogs = Boolean(
    sanitizedSession.plan?.length ||
      sanitizedSession.queue ||
      sanitizedSession.checkpoints?.length,
  );
  const activeMainView =
    activeCompactView === "files" ||
    activeCompactView === "code" ||
    activeCompactView === "preview" ||
    activeCompactView === "tests"
      ? activeCompactView
      : "code";

  useEffect(() => {
    onImmersiveChange?.(
      viewport === "phone" && activeCompactView !== "files",
    );
  }, [activeCompactView, onImmersiveChange, viewport]);

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
        viewport,
        primaryTabs: [],
        filesAction: undefined,
        compactTabs: [
          {
            id: "files",
            label: "Files",
            icon: "files",
            active: activeCompactView === "files",
            disabled: sanitizedSession.files.length === 0,
            onSelect: () => setActiveCompactView("files"),
            testId: "artifact-view-switch-files",
          },
          {
            id: "code",
            label: "Code",
            icon: "code",
            active: activeCompactView === "code",
            onSelect: () => setActiveCompactView("code"),
            testId: "artifact-view-switch-code",
          },
          {
            id: "preview",
            label: "Preview",
            icon: "preview",
            active: activeCompactView === "preview",
            disabled: !hasPreview,
            onSelect: () => setActiveCompactView("preview"),
            testId: "artifact-view-switch-preview",
          },
          {
            id: "terminal",
            label: "Terminal",
            icon: "terminal",
            active: activeCompactView === "terminal",
            disabled: !hasTerminal,
            onSelect: () => setActiveCompactView("terminal"),
            testId: "artifact-view-switch-terminal",
          },
        ],
        overflowTabs: [
          ...(hasTests
            ? [
                {
                  id: "tests" as const,
                  label: "Tests",
                  icon: "tests" as const,
                  active: activeCompactView === "tests",
                  onSelect: () => setActiveCompactView("tests"),
                  testId: "artifact-overflow-item-tests",
                },
              ]
            : []),
          ...(hasLogs
            ? [
                {
                  id: "logs" as const,
                  label: "Logs",
                  icon: "logs" as const,
                  active: activeCompactView === "logs",
                  onSelect: () => setActiveCompactView("logs"),
                  testId: "artifact-overflow-item-logs",
                },
              ]
            : []),
        ],
        main:
          activeCompactView === "files" ? (
            <div className="h-full overflow-auto p-3">
              <NativeIdeWorkbenchExplorer
                session={sanitizedSession}
                selectedPath={selectedPath}
                onSelectPath={setSelectedPath}
                onOpenCode={() => setActiveCompactView("code")}
              />
            </div>
          ) : activeCompactView === "terminal" ? (
            <NativeIdeWorkbenchTerminalDock session={sanitizedSession} />
          ) : activeCompactView === "logs" ? (
            <NativeIdeWorkbenchLogs session={sanitizedSession} />
          ) : (
            <NativeIdeWorkbenchMain
              activeView={activeMainView}
              selectedPath={selectedPath}
              session={sanitizedSession}
            />
          ),
        showMobileBack:
          sanitizedSession.files.length > 0 && activeCompactView !== "files",
        onMobileBack: () => setActiveCompactView("files"),
      }}
    />
  );
}
