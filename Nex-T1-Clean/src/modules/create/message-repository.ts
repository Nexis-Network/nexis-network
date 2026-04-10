import "server-only";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

import type { CreateMessageRecord } from "./types";

function castMessageRecord(value: unknown): CreateMessageRecord {
  return value as CreateMessageRecord;
}

export async function listCreateMessages(
  projectId: string,
): Promise<CreateMessageRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("create_messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(castMessageRecord);
}

export async function upsertCreateMessages(
  rows: Array<Omit<CreateMessageRecord, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("create_messages")
    .upsert(rows, {
      onConflict: "provider_message_id",
      ignoreDuplicates: false,
    });

  if (error) {
    throw error;
  }
}
