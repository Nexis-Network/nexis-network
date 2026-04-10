import { mapUIMessageToCompatMessage } from "./map-compat-message";
import { mapNexChatMessageToUIMessage } from "./map-ui-message";

export type { NexChatMessage } from "./types";
export { mapNexChatMessageToUIMessage };

const CHAT_NORMALIZATION_API = {
  mapToCompatMessage: mapUIMessageToCompatMessage,
  mapToUIMessage: mapNexChatMessageToUIMessage,
} as const;

export function useChatNormalization() {
  return CHAT_NORMALIZATION_API;
}
