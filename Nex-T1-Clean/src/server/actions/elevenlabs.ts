"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/services/supabase/server";

import { fetchAllowedVoices, type VoiceSummary } from "@/server/services/elevenlabs-voices";


import { logger } from '@/lib/logger';
export async function getVoices(): Promise<VoiceSummary[]> {
    return fetchAllowedVoices();
}

export async function updatePreferredVoice(voiceId: string) {
    const supabase = await createClient();
    if (!supabase) {
        throw new Error("Supabase client not available");
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            elevenlabs_voice_id: voiceId,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    if (error) {
        logger.error("Failed to update voice preference:", error);
        throw new Error("Failed to update voice preference");
    }

    revalidatePath("/", "layout");
}
