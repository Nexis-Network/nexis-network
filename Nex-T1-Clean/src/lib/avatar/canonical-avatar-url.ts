function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    if (url.hostname.toLowerCase().startsWith("auth.")) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function resolveSupabaseOrigin(): string | null {
  return (
    normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    null
  );
}

type BuildCanonicalAvatarUrlInput = {
  seed: string;
  size?: number;
  rounded?: boolean;
};

export function buildCanonicalAvatarUrl({
  seed,
  size = 64,
  rounded = true,
}: BuildCanonicalAvatarUrlInput): string | null {
  const origin = resolveSupabaseOrigin();
  if (!origin) {
    return null;
  }

  const params = new URLSearchParams({
    seed,
    size: String(size),
    rounded: rounded ? "1" : "0",
  });

  return `${origin}/functions/v1/user-avatar?${params.toString()}`;
}
