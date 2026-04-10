import type { AIEvent } from "@/lib/schema";
import type { UseMessageArtifactReturn } from "@/lib/ai/use-message-artifact";
import type {
  NativeIdeSessionData,
  NativeWorkflowCanvasData,
} from "@/modules/chat/ui-message-parts";
import {
  isWorkbenchArtifactType,
} from "@/modules/chat/artifact-surfaces";
import { hasRenderableIdeSessionSurface } from "@/modules/chat/ui-message-parts";
import { shouldRenderSandboxWorkbench } from "@/components/artifacts/workbench-routing";
import {
  isActiveAIEvent,
  isActiveToolInvocation,
  type ActiveToolInvocation,
} from "@/components/dashboard/chat-shell/helpers/active-tool";

export type RightPanelMode =
  | "workbench"
  | "workflow"
  | "table"
  | "market_terminal"
  | "agent_wallets"
  | "agent_daos"
  | "dao_workspace"
  | "dao_proposals"
  | "dao_treasury"
  | "burn_rate"
  | "pumpfun_v2"
  | "empty";

type ResolveRightPanelModeInput = {
  activeTool?: UntypedJson | null;
  activeEvent?: AIEvent | null;
  artifactType?: string | null;
  ideSession?: NativeIdeSessionData | null;
  workflowCanvas?: NativeWorkflowCanvasData | null;
};

type ShouldAutoOpenRightPanelInput = ResolveRightPanelModeInput & {
  artifact?: UseMessageArtifactReturn<UntypedJson> | null;
};

const WORKFLOW_CANVAS_EVENT_TYPES = new Set([
  "artifact_update",
  "workflow_update",
  "task_update",
  "confirmation_request",
  "confirmation_response",
]);

export function isDedicatedWorkflowCanvas(
  workflowCanvas?: NativeWorkflowCanvasData | null,
): workflowCanvas is NativeWorkflowCanvasData & { kind: "transaction" | "bridge" } {
  return Boolean(
    workflowCanvas &&
      (workflowCanvas.kind === "transaction" || workflowCanvas.kind === "bridge"),
  );
}

function getActiveToolName(activeTool?: UntypedJson | null): string | null {
  return activeTool &&
    typeof activeTool === "object" &&
    typeof (activeTool as { toolName?: unknown }).toolName === "string"
    ? (activeTool as { toolName: string }).toolName
    : null;
}

function shouldPreferDedicatedWorkflowCanvas({
  activeTool,
  activeEvent,
  ideSession,
  workflowCanvas,
}: Pick<ResolveRightPanelModeInput, "activeTool" | "activeEvent" | "ideSession" | "workflowCanvas">): boolean {
  if (!isDedicatedWorkflowCanvas(workflowCanvas)) {
    return false;
  }

  const toolName = getActiveToolName(activeTool);
  if (toolName && toolName !== "emit_artifact") {
    return false;
  }

  if (activeEvent && !WORKFLOW_CANVAS_EVENT_TYPES.has(activeEvent.type)) {
    return false;
  }

  if (
    ideSession &&
    hasRenderableIdeSessionSurface(ideSession) &&
    ideSession.mode &&
    ideSession.mode !== "transaction-flow"
  ) {
    return false;
  }

  return true;
}

export function resolveRightPanelMode({
  activeTool,
  activeEvent,
  artifactType,
  ideSession,
  workflowCanvas,
}: ResolveRightPanelModeInput): RightPanelMode {
  if (
    shouldPreferDedicatedWorkflowCanvas({
      activeTool,
      activeEvent,
      ideSession,
      workflowCanvas,
    })
  ) {
    return "workflow";
  }

  if (hasRenderableIdeSessionSurface(ideSession)) {
    return "workbench";
  }

  if (shouldRenderSandboxWorkbench(activeTool, activeEvent)) {
    return "workbench";
  }

  if (isDedicatedWorkflowCanvas(workflowCanvas)) {
    return "workflow";
  }

  if (isWorkbenchArtifactType(artifactType)) {
    return "workbench";
  }

  if (artifactType === "table" || artifactType === "table-editor") {
    return "table";
  }

  if (artifactType === "market-terminal" || artifactType === "market_terminal") {
    return "market_terminal";
  }

  if (artifactType === "agent_wallets" || artifactType === "agent-wallets") {
    return "agent_wallets";
  }

  if (artifactType === "agent_daos" || artifactType === "agent-daos") {
    return "agent_daos";
  }

  if (artifactType === "dao_workspace" || artifactType === "dao-workspace") {
    return "dao_workspace";
  }

  if (artifactType === "dao_proposals" || artifactType === "dao-proposals") {
    return "dao_proposals";
  }

  if (artifactType === "dao_treasury" || artifactType === "dao-treasury") {
    return "dao_treasury";
  }

  if (artifactType === "burn_rate" || artifactType === "burn-rate-chart") {
    return "burn_rate";
  }

  if (artifactType === "pumpfun-v2" || artifactType === "pumpfun_v2") {
    return "pumpfun_v2";
  }

  return "empty";
}

export function shouldAutoOpenRightPanel({
  activeTool,
  activeEvent,
  artifactType,
  artifact,
  ideSession,
  workflowCanvas,
}: ShouldAutoOpenRightPanelInput): boolean {
  if (hasRenderableIdeSessionSurface(ideSession) || isDedicatedWorkflowCanvas(workflowCanvas)) {
    return true;
  }

  if (isActiveToolInvocation(activeTool as ActiveToolInvocation | null)) {
    return true;
  }

  if (
    activeEvent?.type === "workflow_update" ||
    activeEvent?.type === "task_update"
  ) {
    return false;
  }

  if (isActiveAIEvent(activeEvent)) {
    return true;
  }

  if (
    resolveRightPanelMode({
      activeTool,
      activeEvent,
      artifactType,
      ideSession,
      workflowCanvas,
    }) !== "empty"
  ) {
    return true;
  }

  return Boolean(
    artifact?.status === "loading" ||
      artifact?.status === "streaming" ||
      (artifact?.hasData && artifact?.data),
  );
}
