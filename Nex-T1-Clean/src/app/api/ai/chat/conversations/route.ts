import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/server/security/with-auth";
import { listMobileConversations } from "@/server/mobile-contracts/chat-history";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) {
    return auth.response;
  }

  if (!auth.session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);

  try {
    const payload = await listMobileConversations(auth.session.user.id, {
      page: parsePositiveInt(url.searchParams.get("page"), 1),
      pageSize: Math.min(parsePositiveInt(url.searchParams.get("page_size"), 20), 100),
      search: url.searchParams.get("search")?.trim() || null,
      sortOrder: url.searchParams.get("sort_order") === "asc" ? "asc" : "desc",
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load conversations.",
      },
      { status: 500 },
    );
  }
}
