import type { UIMessage } from "ai";
import { z } from "zod";

import { validateInputUIMessages } from "@/modules/chat/persistence/ui-message-codec";

const ArtifactRouteBodySchema = z.object({
  messages: z.unknown(),
});

type ParsedArtifactRouteBody =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; response: Response };

function createArtifactRouteErrorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
        status,
      },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function parseArtifactRouteBody(
  body: unknown,
): Promise<ParsedArtifactRouteBody> {
  const parsedBody = ArtifactRouteBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return {
      ok: false,
      response: createArtifactRouteErrorResponse(
        "INVALID_PAYLOAD",
        "Payload must include a messages array.",
        400,
      ),
    };
  }

  try {
    const messages = await validateInputUIMessages(parsedBody.data.messages);
    return { ok: true, messages };
  } catch {
    return {
      ok: false,
      response: createArtifactRouteErrorResponse(
        "INVALID_MESSAGES",
        "Messages payload must contain valid AI SDK UI messages.",
        400,
      ),
    };
  }
}
