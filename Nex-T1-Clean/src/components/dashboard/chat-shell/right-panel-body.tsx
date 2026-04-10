"use client";

import dynamic from "next/dynamic";
import type { MutableRefObject } from "react";
import { useExpandablePanelState } from "@/components/layout/panels/expandable-panel";
import { loadRightPanelArtifact } from "@/components/artifacts/right-panel-artifact-loader";
import {
  resolveRightPanelRenderResetKey,
  RightPanelRenderGuard,
} from "@/components/dashboard/chat-shell/right-panel-render-guard";
import type { UseArtifactPanelStateReturn } from "@/hooks/ai";
import type {
  NativeIdeSessionData,
  NativeWorkflowCanvasData,
} from "@/modules/chat/ui-message-parts";

function ArtifactPanelLoadingShell() {
  return (
    <div
      aria-hidden="true"
      data-testid="artifact-panel-loading"
      className="flex h-full min-h-0 w-full min-w-0 rounded-[30px] border border-[var(--artifact-border)] bg-[var(--artifact-shell)] p-2"
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-[var(--artifact-border-strong)] bg-[var(--artifact-panel)]/70">
        <div className="h-10 shrink-0 border-b border-[var(--artifact-border)] bg-[var(--artifact-panel)]/90" />
        <div className="flex-1 bg-[var(--artifact-panel)]/60" />
      </div>
    </div>
  );
}

const RightPanelArtifact = dynamic(loadRightPanelArtifact, {
  ssr: false,
  loading: () => <ArtifactPanelLoadingShell />,
});

const DocumentPanel = dynamic(
  () =>
    import("@/components/chat/document-panel").then((mod) => ({
      default: mod.DocumentPanel,
    })),
  { ssr: false, loading: () => <div className="h-full w-full" /> },
);

export type RightPanelProps = {
  isMobile: boolean;
  rightPanelState: UseArtifactPanelStateReturn;
  leftPanelState: ReturnType<typeof useExpandablePanelState>;
  marketOverview: UntypedJson;
  onDismissMarketOverview: () => void;
  artifactType?: string | null;
  activeTool?: UntypedJson | null;
  activeEvent?: import("@/lib/schema").AIEvent | null;
  ideSession?: NativeIdeSessionData | null;
  workflowCanvas?: NativeWorkflowCanvasData | null;
};

type RightPanelBodyProps = Omit<RightPanelProps, "isMobile"> & {
  embedded?: boolean;
  onImmersiveChange?: (immersive: boolean) => void;
  openedDocumentId?: string | null;
  panelRef: MutableRefObject<{ resize: (size: number) => void } | null>;
  viewport?: "phone" | "tablet";
};

export function resolveCompactArtifactTitle(args: {
  artifactType?: string | null;
  ideSession?: NativeIdeSessionData | null;
  workflowCanvas?: NativeWorkflowCanvasData | null;
  documentTitle?: string | null;
}): string {
  if (args.documentTitle) {
    return args.documentTitle;
  }

  if (args.ideSession?.title) {
    return args.ideSession.title;
  }

  if (args.workflowCanvas?.title) {
    return args.workflowCanvas.title;
  }

  const fallbackTitle = args.artifactType?.replace(/[_-]+/g, " ");
  return fallbackTitle
    ? fallbackTitle.replace(/\b\w/g, (char) => char.toUpperCase())
    : "Artifacts";
}

export function RightPanelBody({
  activeEvent,
  activeTool,
  artifactType,
  embedded,
  ideSession,
  leftPanelState,
  marketOverview,
  onImmersiveChange,
  onDismissMarketOverview,
  openedDocumentId,
  panelRef,
  rightPanelState,
  viewport,
  workflowCanvas,
}: RightPanelBodyProps) {
  const resetKey = resolveRightPanelRenderResetKey({
    activeEvent,
    activeTool,
    artifactType,
    ideSession,
    openedDocumentId,
    workflowCanvas,
  });

  return (
    <RightPanelRenderGuard resetKey={resetKey}>
      {openedDocumentId ? (
        <DocumentPanel embedded={embedded} />
      ) : (
        <RightPanelArtifact
          activeEvent={activeEvent}
          activeTool={activeTool}
          artifactType={artifactType}
          defaultSize={40}
          embedded={embedded}
          ideSession={ideSession}
          leftPanelState={leftPanelState}
          marketOverview={marketOverview}
          onDismissMarketOverview={onDismissMarketOverview}
          onImmersiveChange={onImmersiveChange}
          panelRef={panelRef}
          rightPanelState={rightPanelState}
          viewport={viewport}
          workflowCanvas={workflowCanvas}
        />
      )}
    </RightPanelRenderGuard>
  );
}
