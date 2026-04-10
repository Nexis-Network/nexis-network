import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

export type TransactionApprovalPreference = {
  enabled: boolean;
  method: "biometric" | "passkey";
  thresholdUsd: number;
};

const DEFAULT_PREFERENCE: TransactionApprovalPreference = {
  enabled: false,
  method: "biometric",
  thresholdUsd: 0,
};

const SCHEMA_CACHE_MISS_PATTERNS = [
  "Could not find the table 'public.user_agent_settings'",
  "relation \"public.user_agent_settings\" does not exist",
  "relation \"user_agent_settings\" does not exist",
] as const;

function isMissingAgentSettingsTable(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();
  return (
    SCHEMA_CACHE_MISS_PATTERNS.some((pattern) =>
      message.includes(pattern.toLowerCase()),
    ) ||
    error.code === "42P01" ||
    error.code === "PGRST102"
  );
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toMethod(value: unknown): TransactionApprovalPreference["method"] {
  return value === "passkey" ? "passkey" : "biometric";
}

function toThresholdUsd(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 0;
}

export async function getTransactionApprovalPreference(
  userId: string,
): Promise<TransactionApprovalPreference> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_agent_settings")
    .select("notification_preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingAgentSettingsTable(error)) {
      return { ...DEFAULT_PREFERENCE };
    }
    throw new Error(`transaction_approval_preferences_read_failed: ${error.message}`);
  }

  const notificationPreferences =
    data?.notification_preferences &&
    typeof data.notification_preferences === "object" &&
    !Array.isArray(data.notification_preferences)
      ? (data.notification_preferences as Record<string, unknown>)
      : {};

  const transactionApproval =
    notificationPreferences["transaction_approval"] &&
    typeof notificationPreferences["transaction_approval"] === "object" &&
    !Array.isArray(notificationPreferences["transaction_approval"])
      ? (notificationPreferences["transaction_approval"] as Record<string, unknown>)
      : {};

  return {
    enabled: toBoolean(transactionApproval["enabled"], DEFAULT_PREFERENCE.enabled),
    method: toMethod(transactionApproval["method"]),
    thresholdUsd: toThresholdUsd(transactionApproval["threshold_usd"]),
  };
}

export async function updateTransactionApprovalPreference(
  userId: string,
  preference: TransactionApprovalPreference,
): Promise<TransactionApprovalPreference> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_agent_settings")
    .select("notification_preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isMissingAgentSettingsTable(error)) {
    throw new Error(`transaction_approval_preferences_read_failed: ${error.message}`);
  }

  const notificationPreferences =
    data?.notification_preferences &&
    typeof data.notification_preferences === "object" &&
    !Array.isArray(data.notification_preferences)
      ? (data.notification_preferences as Record<string, unknown>)
      : {};

  const nextNotificationPreferences = {
    ...notificationPreferences,
    transaction_approval: {
      enabled: preference.enabled,
      method: preference.method,
      threshold_usd: preference.thresholdUsd,
    },
  };

  const { error: upsertError } = await supabase
    .from("user_agent_settings")
    .upsert(
      {
        user_id: userId,
        notification_preferences: nextNotificationPreferences,
      },
      { onConflict: "user_id" },
    );

  if (upsertError) {
    throw new Error(`transaction_approval_preferences_write_failed: ${upsertError.message}`);
  }

  return {
    enabled: preference.enabled,
    method: preference.method,
    thresholdUsd: preference.thresholdUsd,
  };
}
