type RespondToApprovalParams = {
  approvalId: string;
  approved: boolean;
  reason?: string;
};

export class ApprovalRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApprovalRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function respondToApprovalRequest({
  approvalId,
  approved,
  reason,
}: RespondToApprovalParams): Promise<void> {
  const response = await fetch("/api/approvals/respond", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      approvalId,
      approved,
      ...(reason ? { reason } : {}),
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: { message?: string; code?: string } }
    | null;

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.error?.message ||
      (approved ? "Failed to approve request." : "Failed to reject request.");
    throw new ApprovalRequestError(message, response.status, payload?.error?.code);
  }
}
