"use client";

import type {
  CreateCouncilPayload,
  CreateGuardianMemberPayload,
  CreateOverrideEventPayload,
  GuardianCouncilRecord,
  GuardianMemberRecord,
  OverrideEventRecord,
  UpdateCouncilPayload,
  UpdateGuardianMemberPayload,
  UpdateOverrideEventPayload,
} from "@/modules/automation/types";
import {
  guardianCouncilSchema,
  guardianMemberSchema,
  overrideEventSchema,
} from "@/modules/automation/hooks/use-automation-api.schemas";
import {
  type AutomationFetchOptions,
  listRecords,
  mutateRecord,
  mutateWithoutBody,
} from "./automation-api.shared";

export async function fetchGuardianCouncils(
  options: AutomationFetchOptions = {},
): Promise<GuardianCouncilRecord[]> {
  return listRecords(
    "/api/automation/guardian-councils",
    guardianCouncilSchema,
    options,
  );
}

export async function createGuardianCouncilRequest(
  payload: CreateCouncilPayload,
): Promise<GuardianCouncilRecord> {
  return mutateRecord(
    "/api/automation/guardian-councils",
    "POST",
    guardianCouncilSchema,
    "Failed to create guardian council",
    payload,
  );
}

export async function updateGuardianCouncilRequest(args: {
  councilId: string;
  payload: UpdateCouncilPayload;
}): Promise<GuardianCouncilRecord> {
  return mutateRecord(
    `/api/automation/guardian-councils/${args.councilId}`,
    "PATCH",
    guardianCouncilSchema,
    "Failed to update guardian council",
    args.payload,
  );
}

export async function deleteGuardianCouncilRequest(
  councilId: string,
): Promise<void> {
  return mutateWithoutBody(
    `/api/automation/guardian-councils/${councilId}`,
    "Failed to delete guardian council",
  );
}

export async function fetchGuardianMembers(args: {
  councilId: string;
  signal?: AbortSignal;
}): Promise<GuardianMemberRecord[]> {
  return listRecords(
    `/api/automation/guardian-councils/${args.councilId}/members`,
    guardianMemberSchema,
    { signal: args.signal },
  );
}

export async function addGuardianMemberRequest(args: {
  councilId: string;
  payload: CreateGuardianMemberPayload;
}): Promise<GuardianMemberRecord> {
  return mutateRecord(
    `/api/automation/guardian-councils/${args.councilId}/members`,
    "POST",
    guardianMemberSchema,
    "Failed to add guardian member",
    args.payload,
  );
}

export async function updateGuardianMemberRequest(args: {
  councilId: string;
  memberId: string;
  payload: UpdateGuardianMemberPayload;
}): Promise<GuardianMemberRecord> {
  return mutateRecord(
    `/api/automation/guardian-councils/${args.councilId}/members/${args.memberId}`,
    "PATCH",
    guardianMemberSchema,
    "Failed to update guardian member",
    args.payload,
  );
}

export async function removeGuardianMemberRequest(args: {
  councilId: string;
  memberId: string;
}): Promise<void> {
  return mutateWithoutBody(
    `/api/automation/guardian-councils/${args.councilId}/members/${args.memberId}`,
    "Failed to remove guardian member",
  );
}

export async function fetchOverrideEvents(args: {
  councilId: string;
  signal?: AbortSignal;
}): Promise<OverrideEventRecord[]> {
  return listRecords(
    `/api/automation/guardian-councils/${args.councilId}/override-events`,
    overrideEventSchema,
    { signal: args.signal },
  );
}

export async function createOverrideEventRequest(args: {
  councilId: string;
  payload: CreateOverrideEventPayload;
}): Promise<OverrideEventRecord> {
  return mutateRecord(
    `/api/automation/guardian-councils/${args.councilId}/override-events`,
    "POST",
    overrideEventSchema,
    "Failed to create override event",
    args.payload,
  );
}

export async function updateOverrideEventRequest(args: {
  councilId: string;
  eventId: string;
  payload: UpdateOverrideEventPayload;
}): Promise<OverrideEventRecord> {
  return mutateRecord(
    `/api/automation/guardian-councils/${args.councilId}/override-events/${args.eventId}`,
    "PATCH",
    overrideEventSchema,
    "Failed to update override event",
    args.payload,
  );
}

