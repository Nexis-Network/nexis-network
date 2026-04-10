import "server-only";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

import type { CreateProjectRecord } from "./types";

const GUEST_RETENTION_MS = 24 * 60 * 60 * 1000;

function getGuestCutoffIso(): string {
  return new Date(Date.now() - GUEST_RETENTION_MS).toISOString();
}

function castProjectRecord(value: unknown): CreateProjectRecord {
  return value as CreateProjectRecord;
}

export async function insertCreateProject(
  input: Omit<CreateProjectRecord, "id" | "created_at" | "updated_at" | "last_activity_at">,
): Promise<CreateProjectRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("create_projects")
    .insert({
      ...input,
      last_activity_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return castProjectRecord(data);
}

export async function updateCreateProject(
  projectId: string,
  patch: Partial<CreateProjectRecord>,
): Promise<CreateProjectRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("create_projects")
    .update({
      ...patch,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return castProjectRecord(data);
}

export async function getCreateProjectById(
  projectId: string,
): Promise<CreateProjectRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("create_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? castProjectRecord(data) : null;
}

export async function listCreateProjectsForUser(args: {
  orgId: string;
  userId: string;
}): Promise<CreateProjectRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("create_projects")
    .select("*")
    .eq("user_id", args.userId)
    .eq("org_id", args.orgId)
    .order("last_activity_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(castProjectRecord);
}

export async function listCreateProjectsForGuest(
  guestSessionId: string,
): Promise<CreateProjectRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("create_projects")
    .select("*")
    .eq("guest_session_id", guestSessionId)
    .gte("created_at", getGuestCutoffIso())
    .order("last_activity_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(castProjectRecord);
}

export async function countActiveGuestProjects(
  guestSessionId: string,
): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("create_projects")
    .select("id", { count: "exact", head: true })
    .eq("guest_session_id", guestSessionId)
    .gte("created_at", getGuestCutoffIso());

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function claimGuestCreateProject(args: {
  orgId: string;
  projectId: string;
  userId: string;
}): Promise<CreateProjectRecord> {
  return updateCreateProject(args.projectId, {
    guest_session_id: null,
    org_id: args.orgId,
    user_id: args.userId,
  } as Partial<CreateProjectRecord>);
}
