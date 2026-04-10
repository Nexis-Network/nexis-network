"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CompactArtifactShell } from "@/components/artifacts/compact-artifact-shell";
import {
  isImmersiveWorkbenchTab,
  resolveInitialWorkbenchTab,
} from "@/components/artifacts/native-ide-workbench.utils";
import { findOpenedDocumentPart } from "@/components/chat/document-utils";
import { useConversationSession } from "@/components/chat/conversation-session-provider";
import { useMedia } from "@/lib/hooks/use-media";
import { resolveRightPanelMode } from "@/components/artifacts/right-panel-routing";
import {
  resolveCompactArtifactTitle,
  RightPanelBody,
  type RightPanelProps,
} from "@/components/dashboard/chat-shell/right-panel-body";

export function DesktopRightPanel({
  isMobile: _isMobile,
  rightPanelState,
  leftPanelState,
  marketOverview,
  onDismissMarketOverview,
  artifactType,
  activeTool,
  activeEvent,
  ideSession,
  workflowCanvas,
}: RightPanelProps) {
  const isCompactViewport = useMedia("(max-width: 1023px)");
  const panelRef = useRef<{ resize: (size: number) => void } | null>(null);
  const { openedDocumentId } = useConversationSession();

  if (isCompactViewport) return null;

  const isOpen =
    (rightPanelState.isOpen && !rightPanelState.isCollapsed) ||
    !!openedDocumentId;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="h-full min-h-0 w-full min-w-0 overflow-hidden">
      <RightPanelBody
        activeEvent={activeEvent}
        activeTool={activeTool}
        artifactType={artifactType}
        ideSession={ideSession}
        leftPanelState={leftPanelState}
        marketOverview={marketOverview}
        onDismissMarketOverview={onDismissMarketOverview}
        openedDocumentId={openedDocumentId}
        panelRef={panelRef}
        rightPanelState={rightPanelState}
        workflowCanvas={workflowCanvas}
      />
    </div>
  );
}

export function MobileRightPanel({
  isMobile: _isMobile,
  rightPanelState,
  leftPanelState,
  marketOverview,
  onDismissMarketOverview,
  artifactType,
  activeTool,
  activeEvent,
  ideSession,
  workflowCanvas,
}: RightPanelProps) {
  const isPhone = useMedia("(max-width: 767px)");
  const isCompactViewport = useMedia("(max-width: 1023px)");
  const panelRef = useRef<{ resize: (size: number) => void } | null>(null);
  const { messages, openedDocumentId, setOpenedDocumentId } =
    useConversationSession();
  const openedDocument = useMemo(
    () => findOpenedDocumentPart(messages, openedDocumentId),
    [messages, openedDocumentId],
  );
  const panelMode = useMemo(
    () =>
      resolveRightPanelMode({
        activeTool,
        activeEvent,
        artifactType,
        ideSession,
        workflowCanvas,
      }),
    [activeEvent, activeTool, artifactType, ideSession, workflowCanvas],
  );
  const defaultImmersive = useMemo(() => {
    if (!isPhone) {
      return false;
    }

    if (openedDocumentId || panelMode === "workflow") {
      return true;
    }

    if (panelMode !== "workbench" || !ideSession) {
      return false;
    }

    return isImmersiveWorkbenchTab(resolveInitialWorkbenchTab(ideSession, "phone"));
  }, [ideSession, isPhone, openedDocumentId, panelMode]);
  const [isImmersive, setIsImmersive] = useState(defaultImmersive);

  useEffect(() => {
    setIsImmersive(defaultImmersive);
  }, [defaultImmersive]);

  const isOpen =
    (rightPanelState.isOpen && !rightPanelState.isCollapsed) ||
    !!openedDocumentId;

  if (!isCompactViewport || !isOpen) return null;

  const viewport = isPhone ? "phone" : "tablet";
  const panelTitle = resolveCompactArtifactTitle({
    artifactType,
    ideSession,
    workflowCanvas,
    documentTitle: openedDocument?.data.title ?? null,
  });
  const panelSubtitle = openedDocumentId
    ? openedDocument?.data.status ?? "document"
    : ideSession?.mode ?? null;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      return;
    }
    setOpenedDocumentId(null);
    rightPanelState.close();
  };

  return (
    <CompactArtifactShell
      open={isOpen}
      onOpenChange={handleOpenChange}
      immersive={isImmersive}
      viewport={viewport}
      title={panelTitle}
      subtitle={panelSubtitle}
    >
      <div className="flex h-full min-h-0 flex-col gap-3 pt-3">
        <RightPanelBody
          activeEvent={activeEvent}
          activeTool={activeTool}
          artifactType={artifactType}
          embedded
          ideSession={ideSession}
          leftPanelState={leftPanelState}
          marketOverview={marketOverview}
          onImmersiveChange={setIsImmersive}
          onDismissMarketOverview={onDismissMarketOverview}
          openedDocumentId={openedDocumentId}
          panelRef={panelRef}
          rightPanelState={rightPanelState}
          viewport={viewport}
          workflowCanvas={workflowCanvas}
        />
      </div>
    </CompactArtifactShell>
  );
}
