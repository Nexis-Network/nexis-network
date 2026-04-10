import type { useArtifactPanelState } from "@/hooks/ai";
import type { useExpandablePanelState } from "@/components/layout/panels/expandable-panel";
import type { MarketOverviewRequest, PanelRef } from "@/components/layout/panels/panel-types";
import type {
  NativeIdeSessionData,
  NativeWorkflowCanvasData,
} from "@/modules/chat/ui-message-parts";

export type RightPanelArtifactProps = {
  leftPanelState: ReturnType<typeof useExpandablePanelState>;
  rightPanelState: ReturnType<typeof useArtifactPanelState>;
  defaultSize: number;
  panelRef: PanelRef;
  marketOverview?: MarketOverviewRequest | null;
  onDismissMarketOverview?: () => void;
  artifactType?: string | null;
  activeTool?: UntypedJson;
  activeEvent?: import("@/lib/schema").AIEvent | null;
  ideSession?: NativeIdeSessionData | null;
  workflowCanvas?: NativeWorkflowCanvasData | null;
  viewport?: "desktop" | "phone" | "tablet";
  embedded?: boolean;
  onImmersiveChange?: (immersive: boolean) => void;
};

export type RightPanelHeaderProps = {
  onCollapseLeft: () => void;
  onCollapseRight: () => void;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  title?: string;
};
