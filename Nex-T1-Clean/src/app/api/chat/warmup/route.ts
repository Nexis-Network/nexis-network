import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { buildWalletSnapshotPrompt } from "@/server/profile/profile-aggregate";


import { logger } from '@/lib/logger';

export async function POST() {
    return withAuthedSupabase(async ({ cookieBridge, context }) => {
        try {
            if (!context.accessToken) {
                return cookieBridge.commit(apiResponse.unauthorized("Unauthorized"));
            }

            // Trigger snapshot build to populate cache.
            // We force refresh to ensure the user starts their session with fresh data.
            await buildWalletSnapshotPrompt({
                accessToken: context.accessToken,
                userId: context.userId,
                forceRefresh: true,
            });

            return cookieBridge.commit(apiResponse.success({ success: true }));
        } catch (error) {
            logger.error("[chat_warmup] failed", error);
            return cookieBridge.commit(apiResponse.internalError("Internal Server Error"));
        }
    });
}
