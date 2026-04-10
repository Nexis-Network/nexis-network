"use server";

import { createClient } from "@/server/services/supabase/server";
import {
    getNonProductionTestModeUserId,
    isNonProductionTestMode,
} from "@/server/auth/test-mode";
import { revalidatePath } from "next/cache";
import { isEnsSubnameLabelAvailable } from "@/server/services/ens/subnames";
import { validateEnsSubnameLabel } from "@/lib/ens/subnames";
import { triggerUserWalletBootstrap } from "@/server/services/wallets/bootstrap";


import { logger } from '@/lib/logger';
export type OnboardingData = {
    username: string;
    role: string;
    usage: string;
    voiceId: string;
};

type SubmitOnboardingOptions = {
    onboardingCompleted?: boolean;
};

export async function submitOnboarding(
    data: OnboardingData,
    options: SubmitOnboardingOptions = {},
) {
    const supabase = await createClient();
    if (!supabase) {
        throw new Error("Supabase client not available");
    }
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const testModeUserId = isNonProductionTestMode()
        ? getNonProductionTestModeUserId()
        : null;
    const effectiveUserId = user?.id ?? testModeUserId;
    const effectiveUserEmail = user?.email ?? (testModeUserId ? "dev@example.com" : undefined);

    if (!effectiveUserId) {
        return { error: "Unauthorized" };
    }

    const validation = validateEnsSubnameLabel(data.username);
    if (!validation.valid) {
        return { error: validation.error ?? "Username is invalid." };
    }
    const username = validation.normalizedLabel;

    if (testModeUserId && effectiveUserId === testModeUserId) {
        return { success: true, username };
    }

    const availability = await isEnsSubnameLabelAvailable({
        userId: effectiveUserId,
        label: username,
    });
    if (!availability.available) {
        return { error: availability.reason ?? "Username is already taken." };
    }

    const onboardingCompleted = options.onboardingCompleted ?? false;

    const { error } = await supabase.from("profiles").upsert({
        id: effectiveUserId,
        username: username,
        onboarding_role: data.role,
        onboarding_usage: data.usage,
        elevenlabs_voice_id: data.voiceId,
        onboarding_completed: onboardingCompleted,
        updated_at: new Date().toISOString(),
    });

    if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === "23505" && error.message?.includes("username")) {
            return { error: "Username is already taken" };
        }
        logger.error("Onboarding submission error:", error);
        return { error: "Failed to save profile" };
    }

    triggerUserWalletBootstrap({
        userId: effectiveUserId,
        email: effectiveUserEmail,
        source: "onboarding.profile-save",
    });

    revalidatePath("/", "layout");
    revalidatePath("/app", "layout");
    return { success: true, username };
}

export async function checkUsernameAvailability(username: string) {
    const supabase = await createClient();
    if (!supabase) {
        return { available: false, reason: "Database unavailable", normalizedLabel: "" };
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();
    const testModeUserId = isNonProductionTestMode()
        ? getNonProductionTestModeUserId()
        : null;
    const effectiveUserId = user?.id ?? testModeUserId;

    if (!effectiveUserId) {
        return { available: false, reason: "Unauthorized", normalizedLabel: "" };
    }

    if (
        testModeUserId &&
        effectiveUserId === testModeUserId
    ) {
        const validation = validateEnsSubnameLabel(username);
        return validation.valid
            ? { available: true, reason: null, normalizedLabel: validation.normalizedLabel }
            : { available: false, reason: validation.error ?? "Username is invalid.", normalizedLabel: "" };
    }

    return isEnsSubnameLabelAvailable({
        userId: effectiveUserId,
        label: username,
    });
}
