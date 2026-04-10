import type { SupabaseClient } from "@supabase/supabase-js";

import type { Identity } from "@/lib/user/profile";
import { logger } from "@/lib/logger";

export function resetAvatarInput(inputRef: {
  current: HTMLInputElement | null;
}) {
  if (inputRef.current) {
    inputRef.current.value = "";
  }
}

export async function propagateAvatarUpdate(
  supabase: SupabaseClient | null,
  identity: Identity | undefined,
  avatarUrl: string | null,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const existingMetadata =
    (identity?.metadata &&
    typeof identity.metadata === "object" &&
    !Array.isArray(identity.metadata)
      ? identity.metadata
      : {}) ?? {};

  const nextProfileMetadata: Record<string, UntypedJson> = {
    ...existingMetadata,
    avatarUrl: avatarUrl ?? null,
  };

  if (!avatarUrl) {
    nextProfileMetadata.avatarUrl = null;
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      profile: nextProfileMetadata,
      avatarUrl: avatarUrl ?? null,
    },
  });

  if (error) {
    throw error;
  }

  const profileResponse = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ avatarUrl }),
  });

  if (!profileResponse.ok) {
    const body = await profileResponse.json().catch(() => null);
    const detail =
      body?.error ?? body?.message ?? `HTTP ${profileResponse.status}`;
    logger.warn("Avatar profile PATCH failed", {
      status: profileResponse.status,
      detail,
    });
    throw new Error(`Failed to save avatar to profile: ${detail}`);
  }
}
