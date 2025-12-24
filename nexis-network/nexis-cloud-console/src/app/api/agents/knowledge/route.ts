import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/server/identity";
import { listKnowledgeFiles } from "@/lib/server/agent-knowledge";
import { requireCsrf } from "@/lib/server/csrf";
import { sanitizeFilename, sanitizeId } from "@/lib/server/local-store";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import {
  buildAgentServiceHeaders,
  buildAgentsUrl,
  getAgentsServiceBaseUrl,
} from "@/lib/server/agents-service";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    const files = await listKnowledgeFiles(appId, { apiKey, identity });
    return NextResponse.json({ files }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load knowledge files" },
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

  const form = await request.formData();
  const appId = form.get("appId");
  if (typeof appId !== "string" || !appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  const normalizedId = sanitizeId(appId);
  if (!normalizedId) {
    return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  }

  const files = form.getAll("files").filter((entry) => entry instanceof File) as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const payload = new FormData();
  payload.append("appId", normalizedId);

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.` },
        { status: 400 }
      );
    }
    const safeName = sanitizeFilename(file.name);
    if (!safeName) {
      return NextResponse.json({ error: `Invalid file name: ${file.name}` }, { status: 400 });
    }
    payload.append("files", file, safeName);
  }

  const baseUrl = getAgentsServiceBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "Agents service is not configured." }, { status: 501 });
  }

  const headers = buildAgentServiceHeaders({
    apiKey: request.cookies.get(AUTH_COOKIE_NAME)?.value || null,
    identity,
  });
  const response = await fetch(buildAgentsUrl(baseUrl, "knowledge"), {
    method: "POST",
    headers,
    body: payload,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { error: typeof data === "string" ? data : "Unable to upload files." },
      { status: response.status },
    );
  }

  return NextResponse.json(data, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const appId = body?.appId as string | undefined;
  const filename = body?.filename as string | undefined;

  if (!appId || !filename) {
    return NextResponse.json({ error: "appId and filename are required" }, { status: 400 });
  }

  const normalizedId = sanitizeId(appId);
  if (!normalizedId) {
    return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  }
  const safeName = sanitizeFilename(filename);
  if (!safeName) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const baseUrl = getAgentsServiceBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "Agents service is not configured." }, { status: 501 });
  }
  const headers = {
    ...buildAgentServiceHeaders({
      apiKey: request.cookies.get(AUTH_COOKIE_NAME)?.value || null,
      identity,
    }),
    "Content-Type": "application/json",
  };
  const response = await fetch(buildAgentsUrl(baseUrl, "knowledge"), {
    method: "DELETE",
    headers,
    body: JSON.stringify({ appId: normalizedId, filename: safeName }),
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { error: typeof data === "string" ? data : "Unable to delete file." },
      { status: response.status },
    );
  }
  return NextResponse.json(data, { status: 200 });
}
