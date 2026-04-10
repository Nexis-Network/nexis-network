"use client";

import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import {
  parseAutomationApiPayload,
  recordsSchema,
} from "@/modules/automation/hooks/use-automation-api.schemas";

export type AutomationFetchOptions = {
  signal?: AbortSignal;
};

export const automationQueryKeys = {
  sessionKeys: ["automation", "session-keys"] as const,
  strategies: ["automation", "strategies"] as const,
  strategyBindings: (strategyId: string) =>
    ["automation", "strategies", strategyId, "bindings"] as const,
  emptyStrategyBindings: ["automation", "strategies", "empty", "bindings"] as const,
  councils: ["automation", "guardian-councils"] as const,
  councilMembers: (councilId: string) =>
    ["automation", "guardian-councils", councilId, "members"] as const,
  emptyCouncilMembers: ["automation", "guardian-councils", "empty", "members"] as const,
  overrideEvents: (councilId: string) =>
    ["automation", "guardian-councils", councilId, "override-events"] as const,
  emptyOverrideEvents: ["automation", "guardian-councils", "empty", "override-events"] as const,
  paymasterBalances: ["automation", "paymaster-balances"] as const,
};

async function getAccessToken() {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return session?.access_token;
}

export async function automationFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();
  return fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

export async function listRecords<T>(
  url: string,
  schema: z.ZodTypeAny,
  options: AutomationFetchOptions = {},
): Promise<T[]> {
  const response = await automationFetch(url, {
    method: "GET",
    signal: options.signal,
  });
  if (response.status === 401) {
    return [];
  }
  const payload = (await parseAutomationApiPayload(
    response,
    recordsSchema(schema),
    `Failed to load ${url}`,
  )) as { items: T[] };
  return payload.items;
}

export async function mutateRecord<T>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  schema: z.ZodTypeAny,
  fallbackError: string,
  body?: UntypedJson,
): Promise<T> {
  return (await parseAutomationApiPayload(
    await automationFetch(url, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    schema,
    fallbackError,
  )) as T;
}

export async function mutateWithoutBody(
  url: string,
  fallbackError: string,
): Promise<void> {
  const response = await automationFetch(url, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text().catch(() => fallbackError);
    throw new Error(detail || fallbackError);
  }
}

