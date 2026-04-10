import { apiResponse } from "@/lib/api-platform";

import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { getChatCommandInventory } = await import(
      "@/server/chat/command-inventory"
    );
    const inventory = await getChatCommandInventory();
    return apiResponse.success(inventory);
  } catch (error) {
    logger.error("[api/chat/command-inventory] Failed to build inventory", error);
    return apiResponse.internalError("Failed to load command inventory");
  }
}
