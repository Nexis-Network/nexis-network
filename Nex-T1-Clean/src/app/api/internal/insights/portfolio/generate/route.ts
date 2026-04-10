import { connection, NextRequest, NextResponse } from "next/server";

import { getAiInsightService } from "@/server/insights/service";

function parseInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requireInternalInsightSecret(request: NextRequest): void {
  const expectedSecret = String(
    process.env.AI_INSIGHTS_INTERNAL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  ).trim();

  if (!expectedSecret) {
    const error = new Error("AI insight internal secret is not configured.");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (token !== expectedSecret) {
    const error = new Error("Internal AI insight route is not authorized.");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    requireInternalInsightSecret(request);
    const body = await request.json().catch(() => ({}));
    const userIds = Array.isArray(body?.userIds)
      ? body.userIds.filter(
          (value: unknown): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : undefined;
    const limit = Math.min(500, Math.max(1, parseInteger(body?.limit, 200)));
    const offset = Math.max(0, parseInteger(body?.offset, 0));

    const summary = await getAiInsightService().generatePortfolioInsightsBatch({
      userIds,
      limit,
      offset,
    });

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const status = typeof (error as { status?: number }).status === "number"
      ? Number((error as { status?: number }).status)
      : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate portfolio insights",
      },
      { status },
    );
  }
}
