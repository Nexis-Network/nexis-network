import { z } from "zod";
import type { UIMessage } from "ai";

import { decodePersistedUIMessages } from "@/modules/chat/persistence/ui-message-codec";

const ArtifactTableRequestSchema = z.object({
  messages: z.array(z.unknown()),
});

export type ArtifactTableRequest = {
  messages: UIMessage[];
};

type ArtifactTableRequestParseResult =
  | { ok: true; data: ArtifactTableRequest }
  | { ok: false; error: string };

export async function parseArtifactTableRequestBody(
  body: unknown,
): Promise<ArtifactTableRequestParseResult> {
  const result = ArtifactTableRequestSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: "Payload must include a messages array." };
  }

  const messages = await decodePersistedUIMessages(result.data.messages);
  if (messages.length !== result.data.messages.length) {
    return {
      ok: false,
      error: "Messages payload must contain valid AI SDK UI messages.",
    };
  }

  return {
    ok: true,
    data: { messages },
  };
}
