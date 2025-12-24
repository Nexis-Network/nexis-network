import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/server/identity";
import { getAgentConfig } from "@/lib/server/agent-config";
import { decryptSecret, getEncryptionKey } from "@/lib/server/secrets";
import { requireCsrf } from "@/lib/server/csrf";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

function extractReply(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  if (typeof data.reply === "string") return data.reply;
  if (typeof data.response === "string") return data.response;
  if (typeof data.message === "string") return data.message;
  if (typeof data.content === "string") return data.content;
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0] as Record<string, unknown>;
    const message = choice?.message as Record<string, unknown> | undefined;
    if (message && typeof message.content === "string") return message.content;
    if (typeof choice?.text === "string") return choice.text;
  }
  return "";
}

export async function POST(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const appId = body?.appId as string | undefined;
  const message = body?.message as string | undefined;

  if (!appId || !message) {
    return NextResponse.json({ error: "appId and message are required" }, { status: 400 });
  }

  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
  let config: Awaited<ReturnType<typeof getAgentConfig>>;
  try {
    config = await getAgentConfig(appId, { apiKey, identity });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load agent configuration" },
      { status: 502 },
    );
  }

  if (!config) {
    return NextResponse.json({ error: "Agent configuration not found" }, { status: 404 });
  }

  if (!config.endpointUrl) {
    return NextResponse.json({ error: "Endpoint URL is not configured" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (Object.keys(config.headerSecrets || {}).length > 0) {
    if (!getEncryptionKey()) {
      return NextResponse.json({ error: "Secrets storage is disabled" }, { status: 400 });
    }
    for (const [key, encrypted] of Object.entries(config.headerSecrets)) {
      headers[key] = decryptSecret(encrypted);
    }
  }

  const payload =
    config.requestFormat === "openai"
      ? {
          model: config.model || undefined,
          messages: [
            ...(config.prompt ? [{ role: "system", content: config.prompt }] : []),
            { role: "user", content: message },
          ],
        }
      : {
          message,
          prompt: config.prompt || undefined,
          model: config.model || undefined,
        };

  try {
    const response = await fetch(config.endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";
    const raw = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Agent responded with ${response.status}`,
          detail: raw,
        },
        { status: response.status }
      );
    }

    const reply = extractReply(raw);
    return NextResponse.json({ reply, raw }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reach agent." },
      { status: 500 }
    );
  }
}
