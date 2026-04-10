import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIP } from "@/lib/table-editor/rate-limit";
import { requireInternalProtection } from "@/lib/security/csrf";
import { withAuth } from "@/server/security/with-auth";

import { createArtifactTableStreamResponse } from "./route.service";
import { parseArtifactTableRequestBody } from "./route.schema";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const guard = requireInternalProtection(req);
  if (guard) {
    return guard;
  }

  const auth = await withAuth(req, { requireOrg: true });
  if (!auth.ok) {
    return auth.response;
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON with a messages array." },
      { status: 400 },
    );
  }

  const parsedBody = await parseArtifactTableRequestBody(rawBody);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const rateLimitIdentifier = `${getClientIP(req)}:ai-artifact-table`;
  const contextUserId =
    auth.session?.user.id ?? auth.orgId ?? rateLimitIdentifier;
  const rateLimitResult = await checkRateLimit(rateLimitIdentifier);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please try again later.",
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
      {
        status: 429,
        headers: rateLimitResult.headers,
      },
    );
  }

  return createArtifactTableStreamResponse({
    messages: parsedBody.data.messages,
    userId: contextUserId,
  });
}
