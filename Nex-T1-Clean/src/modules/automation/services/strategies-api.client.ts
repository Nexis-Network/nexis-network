"use client";

import type {
  AnchorStrategyPayload,
  AutomationStrategyRecord,
  CreateStrategyBindingPayload,
  CreateStrategyPayload,
  StrategyBindingRecord,
  UpdateStrategyBindingPayload,
  UpdateStrategyPayload,
} from "@/modules/automation/types";
import {
  strategyBindingSchema,
  strategySchema,
} from "@/modules/automation/hooks/use-automation-api.schemas";
import {
  type AutomationFetchOptions,
  listRecords,
  mutateRecord,
  mutateWithoutBody,
} from "./automation-api.shared";

export async function fetchStrategies(
  options: AutomationFetchOptions = {},
): Promise<AutomationStrategyRecord[]> {
  return listRecords("/api/automation/strategies", strategySchema, options);
}

export async function createStrategyRequest(
  payload: CreateStrategyPayload,
): Promise<AutomationStrategyRecord> {
  return mutateRecord(
    "/api/automation/strategies",
    "POST",
    strategySchema,
    "Failed to create strategy",
    payload,
  );
}

export async function updateStrategyRequest(args: {
  id: string;
  payload: UpdateStrategyPayload;
}): Promise<AutomationStrategyRecord> {
  return mutateRecord(
    `/api/automation/strategies/${args.id}`,
    "PATCH",
    strategySchema,
    "Failed to update strategy",
    args.payload,
  );
}

export async function anchorStrategyRequest(args: {
  id: string;
  payload: AnchorStrategyPayload;
}): Promise<AutomationStrategyRecord> {
  return mutateRecord(
    `/api/automation/strategies/${args.id}`,
    "PATCH",
    strategySchema,
    "Failed to anchor strategy",
    { anchor: args.payload },
  );
}

export async function deactivateStrategyRequest(
  id: string,
): Promise<AutomationStrategyRecord> {
  return mutateRecord(
    `/api/automation/strategies/${id}`,
    "DELETE",
    strategySchema,
    "Failed to deactivate strategy",
  );
}

export async function fetchStrategyBindings(args: {
  strategyId: string;
  signal?: AbortSignal;
}): Promise<StrategyBindingRecord[]> {
  return listRecords(
    `/api/automation/strategies/${args.strategyId}/bindings`,
    strategyBindingSchema,
    { signal: args.signal },
  );
}

export async function createStrategyBindingRequest(args: {
  strategyId: string;
  payload: CreateStrategyBindingPayload;
}): Promise<StrategyBindingRecord> {
  return mutateRecord(
    `/api/automation/strategies/${args.strategyId}/bindings`,
    "POST",
    strategyBindingSchema,
    "Failed to create strategy binding",
    args.payload,
  );
}

export async function updateStrategyBindingRequest(args: {
  strategyId: string;
  bindingId: string;
  payload: UpdateStrategyBindingPayload;
}): Promise<StrategyBindingRecord> {
  return mutateRecord(
    `/api/automation/strategies/${args.strategyId}/bindings/${args.bindingId}`,
    "PATCH",
    strategyBindingSchema,
    "Failed to update strategy binding",
    args.payload,
  );
}

export async function deleteStrategyBindingRequest(args: {
  strategyId: string;
  bindingId: string;
}): Promise<void> {
  return mutateWithoutBody(
    `/api/automation/strategies/${args.strategyId}/bindings/${args.bindingId}`,
    "Failed to delete binding",
  );
}

