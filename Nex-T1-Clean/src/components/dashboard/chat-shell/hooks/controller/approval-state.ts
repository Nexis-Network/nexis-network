import type { ConversationMessage } from "@/components/dashboard/chat-types";
import type { ApprovalPayload } from "@/lib/approvals/state-machine";

export type PendingApproval = {
  approvalId: string;
  preview: ApprovalPayload["preview"];
  expiresAt: string;
  toolName?: string | null;
  source: "legacy" | "native";
};

const TERMINAL_APPROVAL_STATES = new Set([
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

type ApprovalRequiredPayload = {
  type: "approval_required";
  approvalId?: string;
  preview?: ApprovalPayload["preview"];
  expiresAt?: string;
  toolName?: string | null;
};

type ApprovalUpdatePayload = {
  type: "approval_update";
  approvalId?: string;
  state?: string;
};

type NativeApprovalPart = {
  type?: string;
  state?: string;
  toolName?: string;
  input?: unknown;
  approval?: {
    id?: string;
    approved?: boolean;
    reason?: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const FALLBACK_APPROVAL_WINDOW_MS = 15 * 60 * 1000;

const isValidPreview = (
  preview: unknown,
): preview is ApprovalPayload["preview"] => {
  if (!isRecord(preview)) return false;
  if (typeof preview.title !== "string") return false;
  if (typeof preview.description !== "string") return false;
  if (!Array.isArray(preview.items)) return false;
  return true;
};

const parseApprovalRequired = (
  payload: ApprovalRequiredPayload,
): PendingApproval | null => {
  if (typeof payload.approvalId !== "string" || payload.approvalId.length === 0)
    return null;
  if (typeof payload.expiresAt !== "string" || payload.expiresAt.length === 0)
    return null;
  if (!isValidPreview(payload.preview)) return null;

  return {
    approvalId: payload.approvalId,
    expiresAt: payload.expiresAt,
    preview: payload.preview,
    toolName: payload.toolName ?? null,
    source: "legacy",
  };
};

function humanizeLabel(value: string): string {
  return value
    .replace(/^tool-/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function derivePreviewItems(
  input: unknown,
): ApprovalPayload["preview"]["items"] {
  if (!isRecord(input)) {
    return [];
  }

  return Object.entries(input)
    .flatMap(([label, value]) => {
      if (value == null) {
        return [];
      }

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return [{ label: humanizeLabel(label), value: String(value) }];
      }

      try {
        return [
          {
            label: humanizeLabel(label),
            value: JSON.stringify(value),
          },
        ];
      } catch {
        return [];
      }
    })
    .slice(0, 6);
}

function parseNativeApprovalPart(part: NativeApprovalPart): PendingApproval | null {
  if (part.state !== "approval-requested") {
    return null;
  }

  const approvalId =
    typeof part.approval?.id === "string" ? part.approval.id : null;
  if (!approvalId) {
    return null;
  }

  const toolName =
    typeof part.toolName === "string" && part.toolName.trim().length > 0
      ? part.toolName.trim()
      : typeof part.type === "string"
        ? part.type.replace(/^tool-/, "").trim() || null
        : null;
  const items = derivePreviewItems(part.input);

  return {
    approvalId,
    expiresAt: new Date(Date.now() + FALLBACK_APPROVAL_WINDOW_MS).toISOString(),
    toolName,
    source: "native",
    preview: {
      title: toolName
        ? `${humanizeLabel(toolName)} requires approval`
        : "Action requires approval",
      description:
        "Review this action and approve or reject it before execution continues.",
      items,
    },
  };
}

function resolveNativeApprovalId(part: NativeApprovalPart): string | null {
  return typeof part.approval?.id === "string" && part.approval.id.length > 0
    ? part.approval.id
    : null;
}

export function resolvePendingApprovalFromMessages(
  messages: ConversationMessage[],
): PendingApproval | null {
  const pendingById = new Map<string, PendingApproval>();

  for (const message of messages) {
    const payloads = Array.isArray(message.payloads) ? message.payloads : [];
    for (const payload of payloads) {
      if (!isRecord(payload) || typeof payload.type !== "string") continue;

      if (payload.type === "approval_required") {
        const parsed = parseApprovalRequired(payload as ApprovalRequiredPayload);
        if (!parsed) continue;
        if (pendingById.has(parsed.approvalId)) {
          pendingById.delete(parsed.approvalId);
        }
        pendingById.set(parsed.approvalId, parsed);
        continue;
      }

      if (payload.type === "approval_update") {
        const update = payload as ApprovalUpdatePayload;
        if (
          typeof update.approvalId === "string" &&
          typeof update.state === "string" &&
          TERMINAL_APPROVAL_STATES.has(update.state)
        ) {
          pendingById.delete(update.approvalId);
        }
      }
    }

    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const rawPart of parts) {
      if (!isRecord(rawPart)) continue;

      const nativePart = rawPart as NativeApprovalPart;
      const pendingNativeApproval = parseNativeApprovalPart(nativePart);
      if (pendingNativeApproval) {
        if (pendingById.has(pendingNativeApproval.approvalId)) {
          pendingById.delete(pendingNativeApproval.approvalId);
        }
        pendingById.set(
          pendingNativeApproval.approvalId,
          pendingNativeApproval,
        );
        continue;
      }

      const approvalId = resolveNativeApprovalId(nativePart);
      if (!approvalId) {
        continue;
      }

      if (
        nativePart.state === "approval-responded" ||
        nativePart.state === "output-available" ||
        nativePart.state === "output-denied" ||
        nativePart.state === "output-error"
      ) {
        pendingById.delete(approvalId);
      }
    }
  }

  const latest = Array.from(pendingById.values()).at(-1);
  return latest ?? null;
}
