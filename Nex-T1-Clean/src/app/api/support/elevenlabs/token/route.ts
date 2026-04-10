import { NextResponse } from "next/server";

import { createClient } from "@/server/services/supabase/server";
import { getElevenLabsSupportConfig } from "@/server/services/elevenlabs-config";

type TokenResponseBody = {
  token?: string;
  conversationToken?: string;
};

export async function POST(request: Request) {
  const config = getElevenLabsSupportConfig();
  if (!config.hasApiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let agentId = config.agentId;
  let voiceId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.agentId === "string" && body.agentId.trim().length > 0) {
      agentId = body.agentId.trim();
    }
    if (typeof body?.voiceId === "string" && body.voiceId.trim().length > 0) {
      voiceId = body.voiceId.trim();
    }
  } catch {
    // ignore JSON parsing issues, fallback to default agent id
  }

  if (!agentId) {
    return NextResponse.json(
      { error: "No ElevenLabs agent ID provided." },
      { status: 400 },
    );
  }

  // Require an authenticated Supabase user so tokens are tied to signed-in sessions
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult?.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const search = new URLSearchParams({ agent_id: agentId });
    // Pass voice override when available; ElevenLabs will ignore unknown params gracefully
    if (voiceId) {
      search.set("voice_id", voiceId);
    }
    search.set("user_id", userId);

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?${search.toString()}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": config.apiKey ?? "",
        },
        cache: "no-store",
      },
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        {
          error: "Failed to retrieve conversation token from ElevenLabs.",
          upstreamStatus: upstream.status,
          upstreamBody: text || undefined,
        },
        { status: 502 },
      );
    }

    const payload = (await upstream.json().catch(() => ({}))) as TokenResponseBody;
    const token = payload.token ?? payload.conversationToken;
    if (!token) {
      return NextResponse.json(
        { error: "ElevenLabs response missing conversation token." },
        { status: 502 },
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error requesting ElevenLabs conversation token.",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
