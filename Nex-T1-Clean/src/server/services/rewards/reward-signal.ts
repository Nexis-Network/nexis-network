import "server-only";

import { createHash } from "node:crypto";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

export type RewardIdentitySignal = {
  id: string;
  userId: string;
  firstIpHash: string | null;
  firstDeviceFingerprintHash: string | null;
  lastIpHash: string | null;
  lastDeviceFingerprintHash: string | null;
};

function getRewardSignalSalt(): string {
  const configured = process.env.REWARD_SIGNAL_SALT?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("REWARD_SIGNAL_SALT is required in production.");
  }

  return "development-reward-signal-salt";
}

function normalizeSignalValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

export function hashRewardSignal(value: string | null | undefined): string | null {
  const normalized = normalizeSignalValue(value);
  if (!normalized) {
    return null;
  }

  return createHash("sha256")
    .update(`${getRewardSignalSalt()}:${normalized}`)
    .digest("hex");
}

function toRewardIdentitySignal(
  row: Record<string, UntypedJson> | null | undefined,
): RewardIdentitySignal | null {
  if (!row || typeof row.id !== "string" || typeof row.user_id !== "string") {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    firstIpHash: typeof row.first_ip_hash === "string" ? row.first_ip_hash : null,
    firstDeviceFingerprintHash:
      typeof row.first_device_fingerprint_hash === "string"
        ? row.first_device_fingerprint_hash
        : null,
    lastIpHash: typeof row.last_ip_hash === "string" ? row.last_ip_hash : null,
    lastDeviceFingerprintHash:
      typeof row.last_device_fingerprint_hash === "string"
        ? row.last_device_fingerprint_hash
        : null,
  };
}

export async function recordRewardIdentitySignal(params: {
  userId: string;
  ipAddress?: string | null;
  deviceId?: string | null;
  metadata?: Record<string, UntypedJson>;
}): Promise<RewardIdentitySignal | null> {
  const ipHash = hashRewardSignal(params.ipAddress);
  const deviceHash = hashRewardSignal(params.deviceId);

  if (!ipHash && !deviceHash) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await supabase
    .from("reward_identity_signals")
    .select(
      "id,user_id,first_ip_hash,first_device_fingerprint_hash,last_ip_hash,last_device_fingerprint_hash",
    )
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const payload = {
    user_id: params.userId,
    first_ip_hash:
      typeof existing?.first_ip_hash === "string" ? existing.first_ip_hash : ipHash,
    first_device_fingerprint_hash:
      typeof existing?.first_device_fingerprint_hash === "string"
        ? existing.first_device_fingerprint_hash
        : deviceHash,
    last_ip_hash: ipHash ?? (typeof existing?.last_ip_hash === "string" ? existing.last_ip_hash : null),
    last_device_fingerprint_hash:
      deviceHash ??
      (typeof existing?.last_device_fingerprint_hash === "string"
        ? existing.last_device_fingerprint_hash
        : null),
    first_seen_at: existing ? undefined : now,
    last_seen_at: now,
    metadata: params.metadata ?? {},
    updated_at: now,
  };

  const builder = existing
    ? supabase.from("reward_identity_signals").update(payload).eq("id", existing.id)
    : supabase.from("reward_identity_signals").insert({
        ...payload,
        created_at: now,
      });

  const { data: saved, error: saveError } = await builder
    .select(
      "id,user_id,first_ip_hash,first_device_fingerprint_hash,last_ip_hash,last_device_fingerprint_hash",
    )
    .single();

  if (saveError) {
    throw saveError;
  }

  return toRewardIdentitySignal(saved);
}

export async function getRewardIdentitySignalsByUserIds(
  userIds: readonly string[],
): Promise<Map<string, RewardIdentitySignal>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reward_identity_signals")
    .select(
      "id,user_id,first_ip_hash,first_device_fingerprint_hash,last_ip_hash,last_device_fingerprint_hash",
    )
    .in("user_id", uniqueUserIds);

  if (error) {
    throw error;
  }

  const entries = (data ?? [])
    .map((row) => toRewardIdentitySignal(row as Record<string, UntypedJson>))
    .filter((row): row is RewardIdentitySignal => row !== null)
    .map((row) => [row.userId, row] as const);

  return new Map(entries);
}
