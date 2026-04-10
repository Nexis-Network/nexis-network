"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ConversationMessage } from "@/components/dashboard/chat-types";
import {
  resolvePendingApprovalFromMessages,
  type PendingApproval,
} from "@/components/dashboard/chat-shell/hooks/controller/approval-state";
import {
  ApprovalRequestError,
  respondToApprovalRequest,
} from "@/components/dashboard/chat-shell/hooks/modules/approval-api";

import { logger } from "@/lib/logger";

type UseChatApprovalControllerArgs = {
  messages: ConversationMessage[];
  respondToToolApproval: (options: {
    id: string;
    approved: boolean;
    reason?: string;
  }) => PromiseLike<void> | void;
};

export function useChatApprovalController({
  messages,
  respondToToolApproval,
}: UseChatApprovalControllerArgs) {
  const [resolvedApprovalIds, setResolvedApprovalIds] = useState<Set<string>>(() => new Set<string>());

  const markApprovalResolved = useCallback((approvalId: string) => {
    setResolvedApprovalIds((previous) => {
      const next = new Set(previous);
      next.add(approvalId);
      return next;
    });
  }, []);

  const pendingApproval = useMemo<PendingApproval | null>(() => {
    const nextPending = resolvePendingApprovalFromMessages(messages);
    if (!nextPending) {
      return null;
    }

    return resolvedApprovalIds.has(nextPending.approvalId) ? null : nextPending;
  }, [messages, resolvedApprovalIds]);

  const respondToPendingApproval = useCallback(
    async (approved: boolean, reason?: string) => {
      if (!pendingApproval) {
        return;
      }

      const approvalId = pendingApproval.approvalId;
      if (pendingApproval.source === "native") {
        await Promise.resolve(
          respondToToolApproval({ id: approvalId, approved, reason }),
        );
      } else {
        await respondToApprovalRequest({ approvalId, approved, reason });
      }

      markApprovalResolved(approvalId);
    },
    [markApprovalResolved, pendingApproval, respondToToolApproval],
  );

  const handleApprovePending = useCallback(async () => {
    if (!pendingApproval) return;
    const approvalId = pendingApproval.approvalId;

    try {
      await respondToPendingApproval(true);
      toast.success("Approval submitted");
    } catch (error) {
      if (error instanceof ApprovalRequestError && (error.status === 409 || error.status === 410)) {
        markApprovalResolved(approvalId);
        toast.warning(error.message || "Approval is no longer pending.");
        return;
      }
      logger.error("Failed to approve pending action", error);
      toast.error(error instanceof Error ? error.message : "Failed to approve request");
    }
  }, [markApprovalResolved, pendingApproval, respondToPendingApproval]);

  const handleRejectPending = useCallback(
    async (reason?: string) => {
      if (!pendingApproval) return;
      const approvalId = pendingApproval.approvalId;

      try {
        await respondToPendingApproval(false, reason);
        toast.success("Request rejected");
      } catch (error) {
        if (error instanceof ApprovalRequestError && (error.status === 409 || error.status === 410)) {
          markApprovalResolved(approvalId);
          toast.warning(error.message || "Approval is no longer pending.");
          return;
        }
        logger.error("Failed to reject pending action", error);
        toast.error(error instanceof Error ? error.message : "Failed to reject request");
      }
    },
    [markApprovalResolved, pendingApproval, respondToPendingApproval],
  );

  const handlePendingExpired = useCallback(() => {
    if (!pendingApproval) return;

    markApprovalResolved(pendingApproval.approvalId);

    toast.warning("Approval request expired");
  }, [markApprovalResolved, pendingApproval]);

  return {
    pendingApproval,
    handleApprovePending,
    handleRejectPending,
    handlePendingExpired,
  };
}
