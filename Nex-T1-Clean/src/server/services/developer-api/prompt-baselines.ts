import "server-only";

import { buildSystemPrompt } from "@/modules/chat/prompt-composer";
import { getSystemPromptProfile } from "@/modules/chat/system-prompt-profiles";
import { getPublicProduct } from "@/server/services/developer-api/product-registry";
import type { PublicDeveloperProductId } from "@/server/services/developer-api/types";

export async function buildPublicSystemPrompt(args: {
  productId: PublicDeveloperProductId;
  instructions?: string | null;
}): Promise<string> {
  const product = getPublicProduct(args.productId);
  const profile = getSystemPromptProfile(product.promptProfileId);

  return buildSystemPrompt({
    basePrompt: product.promptBaseline,
    latestUserMessage: "",
    systemProfileInstruction: profile.instructions,
    promptModuleSegments: args.instructions
      ? [`## Request Directives\n${args.instructions}`]
      : undefined,
  });
}
