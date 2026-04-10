"use client";

import type { ReactNode } from "react";
import type { useSandboxWorkbenchController } from "@/components/artifacts/use-sandbox-workbench-controller";
import { SandboxWorkbenchExplorer } from "@/components/artifacts/sandbox-workbench-explorer";
import { SandboxWorkbenchLogs } from "@/components/artifacts/sandbox-workbench-logs";
import { SandboxWorkbenchMain } from "@/components/artifacts/sandbox-workbench-main";
import { SandboxWorkbenchTerminalDock } from "@/components/artifacts/sandbox-workbench-terminal-dock";
import type { SandboxCompactView, SandboxMainView } from "@/components/artifacts/sandbox-workbench.types";
import type {
  WorkbenchShellAction,
  WorkbenchShellDock,
  WorkbenchShellRail,
  WorkbenchShellViewport,
} from "@/components/artifacts/workbench-shell/types";
import type { useSandboxWorkbenchViewState } from "../../hooks/artifacts/use-sandbox-workbench-view-state";

type ControllerLike = ReturnType<typeof useSandboxWorkbenchController>;
type ViewStateLike = ReturnType<typeof useSandboxWorkbenchViewState>;

function resolveCompactMainView(view: SandboxCompactView): SandboxMainView {
  return view === "logs" || view === "terminal" ? "code" : view;
}

export function buildSandboxWorkbenchOverflowTabs(args: {
  controller: ControllerLike;
  viewState: ViewStateLike;
  viewport: WorkbenchShellViewport;
}): WorkbenchShellAction[] {
  const { controller, viewState, viewport } = args;
  const tabs: WorkbenchShellAction[] = [];
  const addMainTab = (
    id: SandboxMainView,
    label: string,
    icon: WorkbenchShellAction["icon"],
  ) => {
    tabs.push({
      id,
      label,
      icon,
      active:
        viewport === "desktop"
          ? viewState.activeMainView === id
          : viewState.activeCompactView === id,
      onSelect: () =>
        viewport === "desktop"
          ? viewState.selectMainView(id)
          : viewState.selectCompactView(id),
    });
  };

  if (controller.contractFiles.length > 0) addMainTab("contracts", "Contracts", "contracts");
  if (controller.webUrl || controller.webHtml) addMainTab("web", "Web", "web");
  if (controller.pdfUrl || controller.pdfBase64) addMainTab("pdf", "PDF", "pdf");
  if (controller.simulatorEntries.length > 0) {
    addMainTab("simulator", "Simulator", "simulator");
  }
  if (controller.hasPolymarket) addMainTab("polymarket", "Polymarket", "market");
  if (viewport !== "desktop") {
    tabs.push({
      id: "logs",
      label: "Logs",
      icon: "logs",
      active: viewState.activeCompactView === "logs",
      onSelect: () => viewState.selectCompactView("logs"),
      testId: "artifact-overflow-item-logs",
    });
  }

  return tabs;
}

export function resolveSandboxWorkbenchRail(args: {
  controller: ControllerLike;
  viewState: ViewStateLike;
  viewport: WorkbenchShellViewport;
  workspaceLabel: string;
}): WorkbenchShellRail | null {
  const { controller, viewState, viewport, workspaceLabel } = args;
  if (viewport !== "desktop" || controller.files.length === 0) return null;
  return {
    title: workspaceLabel,
    actions: [
      {
        id: "explorer",
        label: "Explorer",
        icon: "explorer",
        active: true,
        onSelect: () => undefined,
      },
      { id: "search", label: "Search", icon: "search", onSelect: () => undefined },
      {
        id: "extensions",
        label: "Extensions",
        icon: "extensions",
        onSelect: () => undefined,
      },
    ],
    content: (
      <SandboxWorkbenchExplorer
        files={controller.files}
        selectedFile={controller.selectedFile}
        onSelectPath={(path) => {
          void controller.loadFileContent(path);
        }}
        onOpenCode={() => viewState.selectMainView("code")}
      />
    ),
  };
}

export function resolveSandboxWorkbenchMainContent(args: {
  controller: ControllerLike;
  loading: boolean;
  viewState: ViewStateLike;
  viewport: WorkbenchShellViewport;
}): ReactNode {
  const { controller, loading, viewState, viewport } = args;
  if (viewport !== "desktop" && viewState.activeCompactView === "files") {
    return (
      <div className="h-full overflow-auto p-3">
        <SandboxWorkbenchExplorer
          files={controller.files}
          selectedFile={controller.selectedFile}
          onSelectPath={(path) => {
            void controller.loadFileContent(path);
          }}
          onOpenCode={() => viewState.selectCompactView("code")}
        />
      </div>
    );
  }
  if (viewport !== "desktop" && viewState.activeCompactView === "terminal") {
    return (
      <SandboxWorkbenchTerminalDock
        sandboxId={controller.sandboxId}
        terminalBusy={controller.terminalBusy}
        terminalInput={controller.terminalInput}
        terminalText={controller.terminalText}
        onRunCommand={controller.runTerminalCommand}
        onTerminalInputChange={controller.setTerminalInput}
      />
    );
  }
  if (viewport !== "desktop" && viewState.activeCompactView === "logs") {
    return (
      <SandboxWorkbenchLogs
        error={controller.error}
        pdfFileName={controller.pdfFileName}
        previewUrl={controller.previewUrl}
        sandboxId={controller.sandboxId}
        simulatorEntries={controller.simulatorEntries}
        terminalText={controller.terminalText}
        webUrl={controller.webUrl}
      />
    );
  }
  return (
    <SandboxWorkbenchMain
      activeView={
        viewport === "desktop"
          ? viewState.activeMainView
          : resolveCompactMainView(viewState.activeCompactView)
      }
      code={controller.effectiveCode}
      contractChain={controller.contractChain}
      contractCommands={controller.contractCommands}
      contractFiles={controller.contractFiles}
      contractFramework={controller.contractFramework}
      files={controller.files}
      loading={loading}
      pdfBase64={controller.pdfBase64}
      pdfFileName={controller.pdfFileName}
      pdfUrl={controller.pdfUrl}
      previewHtml={controller.previewHtml}
      previewUrl={controller.previewUrl}
      selectedContractPath={controller.selectedContractPath}
      selectedFile={controller.selectedFile}
      selectedFileContent={controller.selectedFileContent}
      selectedFileLoading={controller.selectedFileLoading}
      simulatorEntries={controller.simulatorEntries}
      webHtml={controller.webHtml}
      webUrl={controller.webUrl}
      onSelectContractPath={(path) => {
        controller.setSelectedContractPath(path);
        if (controller.sandboxId) {
          void controller.loadFileContent(path);
        }
      }}
    />
  );
}

export function resolveSandboxWorkbenchDock(args: {
  controller: ControllerLike;
  viewState: ViewStateLike;
  viewport: WorkbenchShellViewport;
}): WorkbenchShellDock | null {
  const { controller, viewState, viewport } = args;
  if (
    viewport !== "desktop" ||
    (!controller.hasTerminal && controller.simulatorEntries.length === 0)
  ) {
    return null;
  }
  return {
    tabs: [
      {
        id: "logs",
        label: "Logs",
        icon: "logs",
        active: viewState.activeDockTab === "logs",
        onSelect: () => viewState.selectDockView("logs"),
        testId: "artifact-view-switch-logs",
      },
      {
        id: "terminal",
        label: "Terminal",
        icon: "terminal",
        active: viewState.activeDockTab === "terminal",
        disabled: !controller.hasTerminal,
        onSelect: () => viewState.selectDockView("terminal"),
        testId: "artifact-view-switch-terminal",
      },
    ],
    content:
      viewState.activeDockTab === "terminal" ? (
        <SandboxWorkbenchTerminalDock
          sandboxId={controller.sandboxId}
          terminalBusy={controller.terminalBusy}
          terminalInput={controller.terminalInput}
          terminalText={controller.terminalText}
          onRunCommand={controller.runTerminalCommand}
          onTerminalInputChange={controller.setTerminalInput}
        />
      ) : (
        <SandboxWorkbenchLogs
          error={controller.error}
          pdfFileName={controller.pdfFileName}
          previewUrl={controller.previewUrl}
          sandboxId={controller.sandboxId}
          simulatorEntries={controller.simulatorEntries}
          terminalText={controller.terminalText}
          webUrl={controller.webUrl}
        />
      ),
  };
}
