import { createHash } from "node:crypto";

import { z } from "zod";

export const TransactionApprovalActionSchema = z.enum(["wallets:send"]);

export const WalletSendPayloadSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  value: z.string().min(1),
  chain_id: z.number().int(),
  data: z.string().min(1).optional(),
});

export type TransactionApprovalAction = z.infer<
  typeof TransactionApprovalActionSchema
>;

export type WalletSendPayload = z.infer<typeof WalletSendPayloadSchema>;

function normalizeWalletSendPayload(
  payload: WalletSendPayload,
): WalletSendPayload & { data?: string } {
  const normalized: WalletSendPayload & { data?: string } = {
    from: payload.from.trim(),
    to: payload.to.trim(),
    value: payload.value.trim(),
    chain_id: payload.chain_id,
  };

  const data = payload.data?.trim();
  if (data) {
    normalized.data = data;
  }

  return normalized;
}

export function normalizeTransactionApprovalPayload(
  action: TransactionApprovalAction,
  payload: WalletSendPayload,
): WalletSendPayload {
  if (action === "wallets:send") {
    return normalizeWalletSendPayload(payload);
  }

  return payload;
}

export function hashTransactionApprovalPayload(
  action: TransactionApprovalAction,
  payload: WalletSendPayload,
): string {
  const normalized = normalizeTransactionApprovalPayload(action, payload);
  return createHash("sha256")
    .update(JSON.stringify({ action, payload: normalized }))
    .digest("base64url");
}
