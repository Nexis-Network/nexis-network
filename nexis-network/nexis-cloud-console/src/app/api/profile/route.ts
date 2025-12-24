import { NextRequest, NextResponse } from "next/server";
import { PRIVY_COOKIE_NAME } from "@/lib/auth/constants";
import { requireCsrf } from "@/lib/server/csrf";
import { getPrivyAdminClient } from "@/lib/server/privy-admin";
import { verifyPrivyAuthToken } from "@/lib/server/privy";

function parseProfileInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { displayName: null, avatarUrl: null };
  }
  const data = payload as { displayName?: string; avatarUrl?: string };
  const displayName = typeof data.displayName === "string" ? data.displayName.trim() : null;
  const avatarUrl = typeof data.avatarUrl === "string" ? data.avatarUrl.trim() : null;
  return { displayName, avatarUrl };
}

function validateAvatarUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "Avatar URL must start with http or https.";
    }
  } catch {
    return "Avatar URL must be a valid URL.";
  }
  return null;
}

async function resolveUserId(request: NextRequest) {
  const privyToken = request.cookies.get(PRIVY_COOKIE_NAME)?.value;
  if (!privyToken) return null;
  const claims = await verifyPrivyAuthToken(privyToken);
  return claims.user_id;
}

export async function GET(request: NextRequest) {
  const client = getPrivyAdminClient();
  if (!client) {
    return NextResponse.json({ error: "Privy admin client not configured" }, { status: 501 });
  }

  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await client.users()._get(userId);
    return NextResponse.json({
      customMetadata: user.custom_metadata ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load profile" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const client = getPrivyAdminClient();
  if (!client) {
    return NextResponse.json({ error: "Privy admin client not configured" }, { status: 501 });
  }

  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await request.json();
    const { displayName, avatarUrl } = parseProfileInput(payload);
    if (displayName && displayName.length > 80) {
      return NextResponse.json({ error: "Display name is too long." }, { status: 400 });
    }
    if (avatarUrl && avatarUrl.length > 320) {
      return NextResponse.json({ error: "Avatar URL is too long." }, { status: 400 });
    }
    const urlError = validateAvatarUrl(avatarUrl);
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 });
    }

    const user = await client.users()._get(userId);
    const nextMetadata: Record<string, string | number | boolean> = {
      ...(user.custom_metadata ?? {}),
    };

    if (displayName !== null) {
      nextMetadata.display_name = displayName;
    }
    if (avatarUrl !== null) {
      nextMetadata.avatar_url = avatarUrl;
    }

    const updated = await client.users().setCustomMetadata(userId, {
      custom_metadata: nextMetadata,
    });

    return NextResponse.json({ customMetadata: updated.custom_metadata ?? nextMetadata });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update profile" },
      { status: 500 },
    );
  }
}
