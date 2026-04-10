import { connection, NextRequest, NextResponse } from "next/server";

import { getAiInsightService } from "@/server/insights/service";
import { withAuth } from "@/server/security/with-auth";

export async function GET(request: NextRequest) {
  await connection();

  const auth = await withAuth(request, { requireOrg: false, allowPublic: false });
  if (!auth.ok || !auth.session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const insight = await getAiInsightService().getHomeInsight({
      userId: auth.session.user.id,
    });
    const response = NextResponse.json({ insight }, { status: 200 });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load portfolio insight",
      },
      { status: 500 },
    );
  }
}
