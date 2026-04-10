import { connection, NextRequest, NextResponse } from "next/server";

import { getAiInsightService } from "@/server/insights/service";

function parseInteger(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
    const tokenId = parseNonEmptyString(body?.tokenId);
    const coingeckoId = parseNonEmptyString(body?.coingeckoId);
    const chainId = parseInteger(body?.chainId);

    if (!tokenId && !coingeckoId) {
      return NextResponse.json(
        { error: "Missing required body field: tokenId or coingeckoId" },
        { status: 400 },
      );
    }

    const insight = await getAiInsightService().generateAssetInsight({
      tokenId,
      coingeckoId,
      chainId,
    });
    return NextResponse.json({ insight }, { status: 200 });
  } catch (error) {
    const status = typeof (error as { status?: number }).status === "number"
      ? Number((error as { status?: number }).status)
      : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate asset insight",
      },
      { status },
    );
  }
}
