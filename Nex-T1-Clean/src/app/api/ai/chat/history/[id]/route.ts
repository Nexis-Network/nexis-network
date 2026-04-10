import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { validateInputUIMessages } from "@/modules/chat/persistence/ui-message-codec";
import {
  deleteMobileChatHistory,
  getMobileChatHistory,
  replaceMobileChatHistory,
} from "@/server/mobile-contracts/chat-history";
import { withAuth } from "@/server/security/with-auth";

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  agentId: z.string().trim().min(1).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) {
    return auth.response;
  }

  if (!auth.session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const history = await getMobileChatHistory(auth.session.user.id, id);
    if (!history) {
      return NextResponse.json({ error: "History not found." }, { status: 404 });
    }

    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load chat history.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) {
    return auth.response;
  }

  if (!auth.session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid chat history payload." },
        { status: 400 },
      );
    }

    let messages;
    try {
      messages = await validateInputUIMessages(parsed.data.messages);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid chat history payload.",
        },
        { status: 400 },
      );
    }

    const history = await replaceMobileChatHistory({
      userId: auth.session.user.id,
      conversationId: id,
      messages,
      agentId: parsed.data.agentId ?? null,
    });

    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save chat history.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) {
    return auth.response;
  }

  if (!auth.session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteMobileChatHistory(auth.session.user.id, id);
    return deleted
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ error: "History not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete chat history.",
      },
      { status: 500 },
    );
  }
}
