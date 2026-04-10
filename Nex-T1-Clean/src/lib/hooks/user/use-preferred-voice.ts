"use client";

import { useQuery } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";

export function usePreferredVoiceId() {
  const { status, user } = useAuthContext();
  const supabase = getSupabaseBrowserClient();
  const userId = user?.id ?? null;
  const enabled = status === "authenticated" && Boolean(supabase) && Boolean(userId);

  return useQuery<string | null>({
    queryKey: ["preferred-voice-id", userId],
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (!supabase || !userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("elevenlabs_voice_id")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data?.elevenlabs_voice_id ?? null;
    },
  });
}

