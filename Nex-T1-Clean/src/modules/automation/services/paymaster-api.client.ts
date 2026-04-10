"use client";

import type {
  PaymasterBalanceRecord,
  UpsertPaymasterBalancePayload,
} from "@/modules/automation/types";
import { paymasterBalanceSchema } from "@/modules/automation/hooks/use-automation-api.schemas";
import {
  type AutomationFetchOptions,
  listRecords,
  mutateRecord,
} from "./automation-api.shared";

export async function fetchPaymasterBalances(
  options: AutomationFetchOptions = {},
): Promise<PaymasterBalanceRecord[]> {
  return listRecords(
    "/api/automation/paymaster-balances",
    paymasterBalanceSchema,
    options,
  );
}

export async function upsertPaymasterBalanceRequest(
  payload: UpsertPaymasterBalancePayload,
): Promise<PaymasterBalanceRecord> {
  return mutateRecord(
    "/api/automation/paymaster-balances",
    "PUT",
    paymasterBalanceSchema,
    "Failed to update paymaster balance",
    payload,
  );
}

