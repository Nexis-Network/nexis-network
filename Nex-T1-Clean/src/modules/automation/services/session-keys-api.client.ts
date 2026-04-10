"use client";

import type {
  AutomationSessionKey,
  CreateSessionKeyPayload,
  RevokeSessionKeyPayload,
} from "@/modules/automation/types";
import { sessionKeySchema } from "@/modules/automation/hooks/use-automation-api.schemas";
import {
  type AutomationFetchOptions,
  listRecords,
  mutateRecord,
} from "./automation-api.shared";

export async function fetchSessionKeys(
  options: AutomationFetchOptions = {},
): Promise<AutomationSessionKey[]> {
  return listRecords("/api/automation/session-keys", sessionKeySchema, options);
}

export async function createSessionKeyRequest(
  payload: CreateSessionKeyPayload,
): Promise<AutomationSessionKey> {
  return mutateRecord(
    "/api/automation/session-keys",
    "POST",
    sessionKeySchema,
    "Failed to create session key",
    payload,
  );
}

export async function revokeSessionKeyRequest(args: {
  id: string;
  payload: RevokeSessionKeyPayload;
}): Promise<AutomationSessionKey> {
  return mutateRecord(
    `/api/automation/session-keys/${args.id}`,
    "DELETE",
    sessionKeySchema,
    "Failed to revoke session key",
    args.payload ?? {},
  );
}

