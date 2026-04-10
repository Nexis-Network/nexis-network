import { unwrapApiPayload } from "@/lib/api-platform";

export type OrganizationMember = {
  id: string;
  userId: string;
  role: string;
  createdAt?: string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export type Organization = {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  metadata?: Record<string, UntypedJson> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  members?: OrganizationMember[];
};

function isRecord(value: unknown): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOrganizationMember(value: unknown): OrganizationMember | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string" ? value.id.trim() : String(value.id ?? "").trim();
  const userId =
    typeof value.userId === "string"
      ? value.userId.trim()
      : String(value.userId ?? "").trim();
  const role = typeof value.role === "string" ? value.role.trim() : "";

  if (!id || !userId || !role) {
    return null;
  }

  const user = isRecord(value.user)
    ? {
        id:
          typeof value.user.id === "string" && value.user.id.trim().length > 0
            ? value.user.id
            : userId,
        name: typeof value.user.name === "string" ? value.user.name : null,
        email: typeof value.user.email === "string" ? value.user.email : null,
        image: typeof value.user.image === "string" ? value.user.image : null,
      }
    : undefined;

  return {
    id,
    userId,
    role,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : null,
    user,
  };
}

export function normalizeOrganizationPayload(payload: unknown): Organization | null {
  const unwrapped = unwrapApiPayload<unknown>(payload);
  if (!isRecord(unwrapped)) {
    return null;
  }

  const id =
    typeof unwrapped.id === "string"
      ? unwrapped.id.trim()
      : String(unwrapped.id ?? "").trim();

  if (!id) {
    return null;
  }

  const nameCandidate =
    typeof unwrapped.name === "string" && unwrapped.name.trim().length > 0
      ? unwrapped.name.trim()
      : typeof unwrapped.slug === "string" && unwrapped.slug.trim().length > 0
        ? unwrapped.slug.trim()
        : "Workspace";

  const members = Array.isArray(unwrapped.members)
    ? unwrapped.members
        .map((entry) => normalizeOrganizationMember(entry))
        .filter((entry): entry is OrganizationMember => entry !== null)
    : [];

  return {
    id,
    name: nameCandidate,
    slug: typeof unwrapped.slug === "string" ? unwrapped.slug : null,
    logo: typeof unwrapped.logo === "string" ? unwrapped.logo : null,
    metadata: isRecord(unwrapped.metadata) ? unwrapped.metadata : null,
    createdAt: typeof unwrapped.createdAt === "string" ? unwrapped.createdAt : null,
    updatedAt: typeof unwrapped.updatedAt === "string" ? unwrapped.updatedAt : null,
    members,
  };
}

export function normalizeOrganizationsPayload(payload: unknown): Organization[] {
  const unwrapped = unwrapApiPayload<unknown>(payload);
  if (!Array.isArray(unwrapped)) {
    return [];
  }

  return unwrapped
    .map((entry) => normalizeOrganizationPayload(entry))
    .filter((entry): entry is Organization => entry !== null);
}
