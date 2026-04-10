import { createCompatMessageAccumulator, finalizeCompatMessage } from "./compat-state";
import { processContentPart } from "./compat-content-parts";
import { processPayloadPart } from "./compat-payload-parts";
import { processToolInvocations, processToolPart } from "./compat-tool-parts";
import type { AnyUIMessage, NexChatMessage } from "./types";

export function mapUIMessageToCompatMessage(msg: AnyUIMessage): NexChatMessage {
  const accumulator = createCompatMessageAccumulator(msg);
  processToolInvocations(msg.toolInvocations, accumulator);

  for (const part of accumulator.parts) {
    if (processContentPart(part, accumulator)) {
      continue;
    }

    if (processToolPart(part, accumulator)) {
      continue;
    }

    processPayloadPart(part, accumulator);
  }

  return finalizeCompatMessage(msg, accumulator);
}
