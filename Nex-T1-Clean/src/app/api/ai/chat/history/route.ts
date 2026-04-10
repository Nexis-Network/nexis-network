import { NextResponse, type NextRequest } from "next/server";

import { listMobileChatHistories } from "@/server/mobile-contracts/chat-history";
import { withAuth } from "@/server/security/with-auth";

export async function GET(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) {
    return auth.response;
  }

  if (!auth.session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const histories = await listMobileChatHistories(auth.session.user.id);
    return NextResponse.json({ histories });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load chat histories.",
      },
      { status: 500 },
    );
  }
}
