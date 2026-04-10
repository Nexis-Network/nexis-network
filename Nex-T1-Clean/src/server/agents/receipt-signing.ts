import { createHmac } from "node:crypto";

type ReceiptPayload = {
  campaignId: string;
  distributionId: string | null;
  recipientUserId: string | null;
  recipientAddress: string | null;
  networkId: string;
  assetId: string | null;
  amountBaseUnits: string;
  txHash: string | null;
  createdAt: string;
};

function resolveReceiptSecret(): string {
  const secret = process.env.RECEIPT_SIGNING_SECRET?.trim() || process.env.TASK_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing RECEIPT_SIGNING_SECRET (or TASK_WEBHOOK_SECRET fallback).");
  }
  return secret;
}

export function signCampaignReceipt(payload: ReceiptPayload): string {
  const secret = resolveReceiptSecret();
  const canonical = JSON.stringify(payload);
  return createHmac("sha256", secret).update(canonical).digest("hex");
}
