"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useExpandablePanelState } from "@/components/layout/panels/expandable-panel";
import {
  useActiveArtifact,
  useArtifactPanelState,
  useBurnRateArtifact,
  useMarketTerminalArtifact,
  useTableEditorArtifact,
} from "@/hooks/ai";
import {
  useArtifactRuntime,
  useArtifactRegistryArtifact,
  useSyncMessageArtifacts,
} from "@/lib/ai/artifact-runtime";
import { AgentWalletsArtifact } from "@/modules/ai/artifacts/agent-wallets";
import { PumpFunV2Artifact } from "@/modules/ai/artifacts/pumpfun-v2";
import { useIsMobile } from "@/hooks/ui";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";
import { useConversationSession } from "@/components/chat/conversation-session-provider";
import {
  resolveRightPanelMode,
  shouldAutoOpenRightPanel,
} from "@/components/artifacts/right-panel-routing";
import {
  resolveActiveEventFromMessages,
  resolveActiveIdeSessionFromMessages,
  resolveActiveToolFromMessages,
  resolveActiveWorkflowCanvasFromMessages,
} from "@/components/dashboard/chat-shell/helpers/active-tool";
import { useAutoOpenRightPanel } from "@/components/artifacts/use-auto-open-right-panel";
import {
  shouldHideAppDashboardFooter,
  shouldMaintainDesktopWorkspaceInset,
} from "./app-chat-shell-layout";

export type MarketOverviewState = {
  assets?: string[];
  confidence: MarketIntentAnalysis["confidence"];
  mode: MarketIntentAnalysis["mode"];
  query: string;
  requestedAt: number;
  visible: boolean;
};

export function createMarketOverviewState(
  analysis: MarketIntentAnalysis,
): MarketOverviewState {
  return {
    query: analysis.originalQuery || analysis.focusQuery,
    assets: analysis.assets?.length ? analysis.assets : undefined,
    requestedAt: Date.now(),
    visible: true,
    mode: analysis.mode,
    confidence: analysis.confidence,
  };
}

type ArtifactScopeMessage = {
  role?: string | null;
  parts?: Array<unknown> | null;
  payloads?: Array<unknown> | null;
};

type ArtifactScopePart = {
  type?: unknown;
  data?: unknown;
  output?: unknown;
  result?: unknown;
  parts?: unknown[];
};

function normalizeArtifactScopeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function readArtifactTypeFromValue(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as { type?: unknown; artifactType?: unknown };
  if (typeof record.artifactType === "string" && record.artifactType.trim()) {
    return record.artifactType;
  }

  if (typeof record.type === "string" && record.type.trim()) {
    return record.type;
  }

  return null;
}

function collectArtifactKeysFromParts(
  parts: Array<unknown> | null | undefined,
  keys: Set<string>,
): void {
  if (!Array.isArray(parts)) {
    return;
  }

  for (const rawPart of parts) {
    if (!rawPart || typeof rawPart !== "object" || Array.isArray(rawPart)) {
      continue;
    }

    const part = rawPart as ArtifactScopePart;
    if (typeof part.type === "string") {
      if (part.type.startsWith("data-artifact-")) {
        keys.add(
          normalizeArtifactScopeKey(part.type.replace(/^data-artifact-/, "")),
        );
      } else if (part.type === "data-artifact-card") {
        const artifactType =
          readArtifactTypeFromValue(part.data) ??
          readArtifactTypeFromValue(part.output) ??
          readArtifactTypeFromValue(part.result);

        if (artifactType) {
          keys.add(normalizeArtifactScopeKey(artifactType));
        }
      }
    }

    collectArtifactKeysFromParts(part.parts, keys);

    for (const nestedValue of [part.data, part.output, part.result]) {
      if (
        nestedValue &&
        typeof nestedValue === "object" &&
        !Array.isArray(nestedValue) &&
        Array.isArray((nestedValue as { parts?: unknown[] }).parts)
      ) {
        collectArtifactKeysFromParts(
          (nestedValue as { parts: unknown[] }).parts,
          keys,
        );
      }
    }
  }
}

function collectArtifactKeysFromPayloads(
  payloads: Array<unknown> | null | undefined,
  keys: Set<string>,
): void {
  if (!Array.isArray(payloads)) {
    return;
  }

  for (const rawPayload of payloads) {
    if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
      continue;
    }

    const artifactType = readArtifactTypeFromValue(rawPayload);
    if (artifactType) {
      keys.add(normalizeArtifactScopeKey(artifactType));
    }
  }
}

export function collectConversationArtifactKeys(
  messages: readonly ArtifactScopeMessage[],
): Set<string> {
  const keys = new Set<string>();

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }

    collectArtifactKeysFromParts(message.parts, keys);
    collectArtifactKeysFromPayloads(message.payloads, keys);
  }

  return keys;
}

export function conversationHasArtifactKey(
  keys: ReadonlySet<string>,
  ...candidates: string[]
): boolean {
  return candidates.some((candidate) =>
    keys.has(normalizeArtifactScopeKey(candidate)),
  );
}

export function useAppChatShellState() {
  const isMobile = useIsMobile();
  const {
    currentConversationId,
    openedDocumentId,
    messages: sessionMessages,
    setOpenedDocumentId,
  } =
    useConversationSession();
  const { clearArtifacts } = useArtifactRuntime();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isReleasePopupVisible, setIsReleasePopupVisible] = useState(false);
  const leftPanelState = useExpandablePanelState();
  const burnRateData = useBurnRateArtifact();
  const tableData = useTableEditorArtifact();
  const marketTerminalData = useMarketTerminalArtifact();
  const pumpFunV2Data = useArtifactRegistryArtifact(PumpFunV2Artifact);
  const agentWalletsData = useArtifactRegistryArtifact(AgentWalletsArtifact);

  useSyncMessageArtifacts(sessionMessages);

  const conversationArtifactKeys = useMemo(
    () => collectConversationArtifactKeys(sessionMessages),
    [sessionMessages],
  );

  const [activeArtifact, activeArtifactType] = useActiveArtifact([
    {
      artifact: conversationHasArtifactKey(
        conversationArtifactKeys,
        "market-terminal",
        "market_terminal",
      )
        ? marketTerminalData
        : null,
      type: "market-terminal",
    },
    {
      artifact: conversationHasArtifactKey(
        conversationArtifactKeys,
        "pumpfun-v2",
        "pumpfun_v2",
      )
        ? pumpFunV2Data
        : null,
      type: "pumpfun-v2",
    },
    {
      artifact: conversationHasArtifactKey(
        conversationArtifactKeys,
        "table",
        "table-editor",
      )
        ? tableData
        : null,
      type: "table",
    },
    {
      artifact: conversationHasArtifactKey(
        conversationArtifactKeys,
        "agent_wallets",
        "agent-wallets",
      )
        ? agentWalletsData
        : null,
      type: "agent_wallets",
    },
    {
      artifact: conversationHasArtifactKey(
        conversationArtifactKeys,
        "burn_rate",
        "burn-rate",
        "burn-rate-chart",
      )
        ? burnRateData
        : null,
      type: "burn_rate",
    },
  ]);

  const activeTool = useMemo(
    () => resolveActiveToolFromMessages(sessionMessages),
    [sessionMessages],
  );
  const activeEvent = useMemo(
    () => resolveActiveEventFromMessages(sessionMessages),
    [sessionMessages],
  );
  const activeIdeSession = useMemo(
    () => resolveActiveIdeSessionFromMessages(sessionMessages),
    [sessionMessages],
  );
  const activeWorkflowCanvas = useMemo(
    () => resolveActiveWorkflowCanvasFromMessages(sessionMessages),
    [sessionMessages],
  );
  const [marketOverview, setMarketOverview] =
    useState<MarketOverviewState | null>(null);

  const rightPanelState = useArtifactPanelState({
    artifact: activeArtifact,
    autoOpenWhen: (artifact) =>
      shouldAutoOpenRightPanel({
        activeTool,
        activeEvent,
        artifactType: activeArtifactType,
        ideSession: activeIdeSession,
        workflowCanvas: activeWorkflowCanvas,
        artifact,
      }),
  });

  const shouldAutoOpenPanel = useMemo(
    () =>
      shouldAutoOpenRightPanel({
        activeTool,
        activeEvent,
        artifactType: activeArtifactType,
        ideSession: activeIdeSession,
        workflowCanvas: activeWorkflowCanvas,
        artifact: activeArtifact,
      }),
    [
      activeArtifact,
      activeArtifactType,
      activeEvent,
      activeIdeSession,
      activeTool,
      activeWorkflowCanvas,
    ],
  );

  useAutoOpenRightPanel({
    panelState: rightPanelState,
    shouldAutoOpen: shouldAutoOpenPanel,
  });

  const emptySessionResetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionMessages.length > 0) {
      emptySessionResetKeyRef.current = null;
      return;
    }

    const resetKey = currentConversationId ?? "__empty-conversation__";
    if (emptySessionResetKeyRef.current === resetKey) {
      return;
    }

    emptySessionResetKeyRef.current = resetKey;

    clearArtifacts();
    rightPanelState.close();
    setMarketOverview(null);
    setOpenedDocumentId(null);
  }, [
    clearArtifacts,
    currentConversationId,
    rightPanelState,
    sessionMessages.length,
    setOpenedDocumentId,
  ]);

  const handleMarketIntent = useCallback((analysis: MarketIntentAnalysis) => {
    setMarketOverview(createMarketOverviewState(analysis));
  }, []);

  const handleDismissMarketOverview = useCallback(() => {
    setMarketOverview((previous) =>
      previous ? { ...previous, visible: false } : previous,
    );
  }, []);

  const isDesktopArtifactPanelVisible =
    !isMobile &&
    ((rightPanelState.isOpen && !rightPanelState.isCollapsed) ||
      Boolean(openedDocumentId));

  const activeRightPanelMode = resolveRightPanelMode({
    activeTool,
    activeEvent,
    artifactType: activeArtifactType,
    ideSession: activeIdeSession,
    workflowCanvas: activeWorkflowCanvas,
  });

  return {
    activeArtifactType,
    activeEvent,
    activeIdeSession,
    activeRightPanelMode,
    activeTool,
    activeWorkflowCanvas,
    handleDismissMarketOverview,
    handleMarketIntent,
    isDesktopArtifactPanelVisible,
    isMobile,
    isReleasePopupVisible,
    isSidebarOpen,
    leftPanelState,
    marketOverview,
    rightPanelState,
    setIsReleasePopupVisible,
    setIsSidebarOpen,
    shouldAddConversationLeftInset:
      !isSidebarOpen && isDesktopArtifactPanelVisible,
    shouldHideFooter: shouldHideAppDashboardFooter({
      activeRightPanelMode,
      openedDocumentId,
      rightPanelIsCollapsed: rightPanelState.isCollapsed,
      rightPanelIsOpen: rightPanelState.isOpen,
    }),
    shouldMaintainDesktopRightSpacing: shouldMaintainDesktopWorkspaceInset({
      rightPanelIsVisible: isDesktopArtifactPanelVisible,
    }),
  };
}
