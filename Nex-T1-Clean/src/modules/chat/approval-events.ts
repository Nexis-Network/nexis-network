import type { ApprovalPayload } from "@/lib/approvals/state-machine";

type ApprovalEventEmitter = (type: "approval_required" | "approval_update", payload: Record<string, UntypedJson>) => void;

type EmitApprovalLifecycleEventsParams = {
  output: UntypedJson;
  toolName?: string | null;
  emit: ApprovalEventEmitter;
};

const APPROVAL_UPDATE_STATES = new Set([
  "ready",
  "approved",
  "auto_approved",
  "rejected",
  "denied",
  "expired",
  "cancelled",
  "failed",
  "error",
  "completed",
]);
const NESTED_STATE_KEYS = ["output", "result", "data"];

const toRecord = (value: UntypedJson): Record<string, UntypedJson> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, UntypedJson>;
};

const resolveStatefulRecord = (value: UntypedJson): Record<string, UntypedJson> | null => {
  const root = toRecord(value);
  if (!root) {
    return null;
  }

  if (typeof root.state === "string") {
    return root;
  }

  for (const key of NESTED_STATE_KEYS) {
    const nested = toRecord(root[key as keyof typeof root]);
    if (nested && typeof nested.state === "string") {
      return nested;
    }
  }

  return null;
};

const normalizeToolName = (toolName?: string | null) => {
  if (typeof toolName === "string" && toolName.trim().length > 0) {
    return toolName;
  }
  return null;
};

export function emitApprovalLifecycleEvents({ output, toolName, emit }: EmitApprovalLifecycleEventsParams) {
  const record = resolveStatefulRecord(output);
  if (!record) {
    return;
  }

  const state = typeof record.state === "string" ? record.state : undefined;
  if (!state) {
    return;
  }

  const normalizedToolName = normalizeToolName(toolName);

  if (state === "approval-required") {
    const approvalId = typeof record.approvalId === "string" ? record.approvalId : undefined;
    const expiresAt = typeof record.expiresAt === "string" ? record.expiresAt : undefined;
    const preview = record.preview as ApprovalPayload["preview"] | undefined;

    if (approvalId && expiresAt && preview) {
      emit("approval_required", {
        toolName: normalizedToolName,
        approvalId,
        expiresAt,
        preview,
      });
    }
    return;
  }

  if (APPROVAL_UPDATE_STATES.has(state)) {
    emit("approval_update", {
      toolName: normalizedToolName,
      approvalId: typeof record.approvalId === "string" ? record.approvalId : undefined,
      state,
      reason: typeof record.reason === "string" ? record.reason : undefined,
    });
  }
}
