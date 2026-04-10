import { connection } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { fetchAllowedVoices } from "@/server/services/elevenlabs-voices";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  await connection();
  const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
  if (!auth.ok) {
    return apiResponse.unauthorized();
  }

  try {
    // Check if API key is configured
    if (!process.env.ELEVENLABS_API_KEY) {
      logger.warn("[elevenlabs/voices] ELEVENLABS_API_KEY not configured");
      return apiResponse.error(
        "ELEVENLABS_NOT_CONFIGURED",
        "Voice service is not configured. Please add ELEVENLABS_API_KEY to your environment.",
        503
      );
    }

    const voices = await fetchAllowedVoices();

    if (voices.length === 0) {
      logger.warn("[elevenlabs/voices] No voices returned from ElevenLabs API");
    }

    return apiResponse.success({ voices });
  } catch (error) {
    logger.error("[elevenlabs/voices] Error fetching voices:", error);
    return apiResponse.error(
      "ELEVENLABS_ERROR",
      "Failed to fetch voices from ElevenLabs",
      500
    );
  }
}
