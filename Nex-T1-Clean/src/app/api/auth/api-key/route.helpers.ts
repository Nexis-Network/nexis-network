import { listPublicProducts } from "@/server/services/developer-api/product-registry";
import type { PublicDeveloperProductId } from "@/server/services/developer-api/types";

export type ApiKeyProjectBindingSupabaseClient = {
  from: (table: string) => {
    select: (query: string) => {
      eq: (column: string, value: UntypedJson) => {
        maybeSingle: () => PromiseLike<{
          data: {
            id: string;
            owner_type: "user" | "organization";
            owner_id: string;
          } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export function normalizeAllowedProducts(
  raw: UntypedJson,
): PublicDeveloperProductId[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const allowedIds = new Set(listPublicProducts().map((product) => product.id));
  const normalized = raw
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry): entry is PublicDeveloperProductId => allowedIds.has(entry as PublicDeveloperProductId));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : null;
}

export async function validateApiKeyProjectBinding(
  supabase: ApiKeyProjectBindingSupabaseClient,
  args: {
    projectId: string | null;
    ownerType: "user" | "organization";
    ownerId: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!args.projectId) {
    return { ok: true };
  }

  const { data, error } = await supabase
    .from("api_project")
    .select("id,owner_type,owner_id")
    .eq("id", args.projectId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data) {
    return { ok: false, message: "Developer project not found." };
  }

  if (
    data.owner_type !== args.ownerType ||
    data.owner_id !== args.ownerId
  ) {
    return {
      ok: false,
      message: "API key project must belong to the same owner as the key.",
    };
  }

  return { ok: true };
}
