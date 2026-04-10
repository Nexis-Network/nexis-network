import type { ImmediateChatReply } from "@/modules/chat/utils";
import {
  createImmediateResponse,
  isSimpleGreeting,
  maybeCreateTrendingResponse,
} from "@/modules/chat/utils";

type PreflightShortcutOptions = {
  userId?: string | null;
  latestUserMessage: string;
  requestedModelAlias: string;
  billingModelKey: string;
  attachmentCount?: number;
};

export async function getChatPreflightShortcut(
  options: PreflightShortcutOptions,
): Promise<ImmediateChatReply | null> {
  const {
    userId,
    latestUserMessage,
    requestedModelAlias,
    billingModelKey,
    attachmentCount,
  } = options;

  if (
    !userId &&
    (requestedModelAlias === "nex-t1-max" || billingModelKey === "nex-t1-ultra")
  ) {
    return createImmediateResponse("Please sign in to use MAX models.");
  }

  if (isSimpleGreeting(latestUserMessage)) {
    return createImmediateResponse(
      "Hey friend, how is your day going? Is there anything I can help you with?",
    );
  }

  if ((attachmentCount ?? 0) > 0) {
    return null;
  }

  return maybeCreateTrendingResponse(latestUserMessage);
}
