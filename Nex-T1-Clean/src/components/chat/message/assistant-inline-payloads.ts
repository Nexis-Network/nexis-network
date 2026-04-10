import { isRightPanelOnlyArtifactType } from "@/modules/chat/artifact-surfaces";
import { isWorkbenchToolName } from "@/components/artifacts/workbench-routing";
import type { AssistantPayload } from "@/components/chat/types";

export function shouldRenderPayloadInline(
  payload: AssistantPayload,
): boolean {
  if (payload.type === "tool-execution") {
    if (!isWorkbenchToolName(payload.toolName)) {
      return true;
    }

    return (
      payload.status !== "pending" &&
      payload.status !== "executing" &&
      payload.status !== "complete"
    );
  }

  return !isRightPanelOnlyArtifactType(payload.type);
}
