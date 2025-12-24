import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/server/identity";
import { getEncryptionKey, encryptSecret } from "@/lib/server/secrets";
import { getAgentConfig, toView, upsertAgentConfig } from "@/lib/server/agent-config";
import { listKnowledgeFiles } from "@/lib/server/agent-knowledge";
import { requireCsrf } from "@/lib/server/csrf";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

function parseKeyValueInput(input: string) {
  const entries: Record<string, string> = {};
  const invalid: string[] = [];
  const lines = input.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      invalid.push(trimmed);
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key || !value) {
      invalid.push(trimmed);
      continue;
    }
    entries[key] = value;
  }
  return { entries, invalid };
}

export async function GET(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get("appId");
  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  try {
    const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
    const auth = { apiKey, identity };
    const config = await getAgentConfig(appId, auth);
    const knowledge = await listKnowledgeFiles(appId, auth);
    return NextResponse.json(
      {
        config: config ? toView(config) : null,
        knowledge,
        secretsEnabled: Boolean(getEncryptionKey()),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load agent configuration" },
      { status: 502 },
    );
  }
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
  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  const endpointUrl = typeof body?.endpointUrl === "string" ? body.endpointUrl.trim() : undefined;
  const model = typeof body?.model === "string" ? body.model.trim() : undefined;
  const requestFormat =
    body?.requestFormat === "openai" || body?.requestFormat === "generic"
      ? body.requestFormat
      : undefined;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : undefined;

  const envText = typeof body?.envText === "string" ? body.envText : undefined;
  const headerText = typeof body?.headerText === "string" ? body.headerText : undefined;

  const updates: Record<string, unknown> = {
    name: name || undefined,
    description: description || null,
    endpointUrl: endpointUrl || null,
    model: model || null,
    prompt: prompt || null,
    requestFormat: requestFormat || "generic",
  };

  const secretsEnabled = Boolean(getEncryptionKey());
  const invalidLines: string[] = [];

  if (envText !== undefined) {
    if (!secretsEnabled && envText.trim().length > 0) {
      return NextResponse.json(
        { error: "Secrets storage is disabled. Set NEXIS_CONSOLE_ENCRYPTION_KEY." },
        { status: 400 }
      );
    }
    const { entries, invalid } = parseKeyValueInput(envText);
    invalidLines.push(...invalid.map((line) => `env: ${line}`));
    if (secretsEnabled) {
      const encrypted: Record<string, string> = {};
      Object.entries(entries).forEach(([key, value]) => {
        encrypted[key] = encryptSecret(value);
      });
      updates.envSecrets = encrypted;
    } else {
      updates.envSecrets = {};
    }
  }

  if (headerText !== undefined) {
    if (!secretsEnabled && headerText.trim().length > 0) {
      return NextResponse.json(
        { error: "Secrets storage is disabled. Set NEXIS_CONSOLE_ENCRYPTION_KEY." },
        { status: 400 }
      );
    }
    const { entries, invalid } = parseKeyValueInput(headerText);
    invalidLines.push(...invalid.map((line) => `header: ${line}`));
    if (secretsEnabled) {
      const encrypted: Record<string, string> = {};
      Object.entries(entries).forEach(([key, value]) => {
        encrypted[key] = encryptSecret(value);
      });
      updates.headerSecrets = encrypted;
    } else {
      updates.headerSecrets = {};
    }
  }

  if (invalidLines.length > 0) {
    return NextResponse.json(
      { error: "Invalid key/value lines", invalid: invalidLines },
      { status: 400 }
    );
  }

  try {
    const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
    const updated = await upsertAgentConfig(appId, updates, { apiKey, identity });
    return NextResponse.json({ config: toView(updated), secretsEnabled }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update agent configuration" },
      { status: 502 },
    );
  }
}
