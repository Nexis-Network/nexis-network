import { unwrapApiPayload } from "@/lib/api-platform";

export type UserOrganization = {
  id: string;
  name: string;
  slug?: string;
};

export async function fetchUserOrganizations(options: { signal?: AbortSignal; accessToken?: string | null } = {}): Promise<UserOrganization[]> {
  try {
    const { accessToken } = options;
    const response = await fetch("/api/auth/organization/list", {
      cache: "no-store",
      credentials: "include",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    if (!response.ok) {
      return [];
    }
    const raw = await response.json().catch(() => null);
    const organizations = unwrapApiPayload<UntypedJson[]>(raw);
    if (!Array.isArray(organizations)) {
      return [];
    }
    return organizations
      .map((entry) => {
        const id = String(entry?.id ?? entry?.account_id ?? entry?.accountId ?? "").trim();
        const name = String(entry?.name ?? entry?.slug ?? "Workspace").trim();
        const slug = typeof entry?.slug === "string" ? entry.slug : undefined;
        return id ? ({ id, name: name || id.slice(0, 8), slug } as UserOrganization) : null;
      })
      .filter((entry): entry is UserOrganization => entry !== null);
  } catch {
    return [];
  }
}
