"use client";

import { useEffect, useState } from "react";
import type {
  SandboxCompactView,
  SandboxDockView,
  SandboxMainView,
  WorkbenchTab,
} from "@/components/artifacts/sandbox-workbench.types";
import type { WorkbenchShellViewport } from "@/components/artifacts/workbench-shell/types";

type UseSandboxWorkbenchViewStateArgs = {
  activeTab: WorkbenchTab;
  hasContracts: boolean;
  hasFiles: boolean;
  hasPdf: boolean;
  hasPolymarket: boolean;
  hasPreview: boolean;
  hasSimulator: boolean;
  hasTerminal: boolean;
  hasWeb: boolean;
  onTabChange: (tab: WorkbenchTab) => void;
  viewport: WorkbenchShellViewport;
};

function resolveFallbackMainView(args: {
  hasFiles: boolean;
  hasPreview: boolean;
  hasContracts: boolean;
  hasWeb: boolean;
  hasPdf: boolean;
  hasSimulator: boolean;
  hasPolymarket: boolean;
}): SandboxMainView {
  if (args.hasFiles) return "files";
  if (args.hasPreview) return "preview";
  if (args.hasContracts) return "contracts";
  if (args.hasWeb) return "web";
  if (args.hasPdf) return "pdf";
  if (args.hasSimulator) return "simulator";
  if (args.hasPolymarket) return "polymarket";
  return "code";
}

export function useSandboxWorkbenchViewState({
  activeTab,
  hasContracts,
  hasFiles,
  hasPdf,
  hasPolymarket,
  hasPreview,
  hasSimulator,
  hasTerminal,
  hasWeb,
  onTabChange,
  viewport,
}: UseSandboxWorkbenchViewStateArgs) {
  const fallbackMainView = resolveFallbackMainView({
    hasContracts,
    hasFiles,
    hasPdf,
    hasPolymarket,
    hasPreview,
    hasSimulator,
    hasWeb,
  });
  const initialCompactView: SandboxCompactView =
    viewport === "phone" && hasFiles ? "files" : activeTab;
  const [activeMainView, setActiveMainView] = useState<SandboxMainView>(
    activeTab === "terminal" ? fallbackMainView : activeTab,
  );
  const [activeDockTab, setActiveDockTab] = useState<SandboxDockView>(
    activeTab === "terminal" && hasTerminal ? "terminal" : "logs",
  );
  const [activeCompactView, setActiveCompactView] =
    useState<SandboxCompactView>(initialCompactView);

  useEffect(() => {
    if (activeTab === "terminal") {
      if (hasTerminal) {
        setActiveDockTab("terminal");
      }
      if (viewport !== "desktop") {
        setActiveCompactView("terminal");
      }
      return;
    }

    setActiveMainView(activeTab);
    if (viewport !== "desktop") {
      setActiveCompactView(activeTab);
    }
  }, [activeTab, hasTerminal, viewport]);

  useEffect(() => {
    if (viewport === "desktop") return;
    setActiveCompactView((current) => {
      if (current === "terminal" && hasTerminal) return current;
      if (current === "files" && hasFiles) return current;
      if (current === "preview" && hasPreview) return current;
      if (current === "contracts" && hasContracts) return current;
      if (current === "web" && hasWeb) return current;
      if (current === "pdf" && hasPdf) return current;
      if (current === "simulator" && hasSimulator) return current;
      if (current === "polymarket" && hasPolymarket) return current;
      return viewport === "phone" && hasFiles ? "files" : fallbackMainView;
    });
  }, [
    fallbackMainView,
    hasContracts,
    hasFiles,
    hasPdf,
    hasPolymarket,
    hasPreview,
    hasSimulator,
    hasTerminal,
    hasWeb,
    viewport,
  ]);

  const selectMainView = (view: SandboxMainView) => {
    setActiveMainView(view);
    onTabChange(view);
  };
  const selectDockView = (view: SandboxDockView) => {
    setActiveDockTab(view);
    if (view === "terminal") {
      onTabChange("terminal");
    }
  };
  const selectCompactView = (view: SandboxCompactView) => {
    setActiveCompactView(view);
    if (view !== "logs") {
      onTabChange(view);
    }
  };

  return {
    activeCompactView,
    activeDockTab,
    activeMainView,
    fallbackMainView,
    selectCompactView,
    selectDockView,
    selectMainView,
    setActiveCompactView,
  };
}
