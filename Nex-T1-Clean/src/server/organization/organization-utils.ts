import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

const SLUG_REGEX = /[^a-z0-9]+/g;

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

const RELATION_MISSING_CODES = new Set(["42P01", "PGRST106"]);
const COLUMN_MISSING_CODES = new Set(["42703"]);

const isMissingRelation = (error: SupabaseErrorLike | null | undefined) => {
  if (!error) return false;
  const code = typeof error.code === "string" ? error.code : null;
  if (code && RELATION_MISSING_CODES.has(code)) return true;
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return message.includes("relation") && message.includes("does not exist");
};

const isMissingColumn = (error: SupabaseErrorLike | null | undefined) => {
  if (!error) return false;
  const code = typeof error.code === "string" ? error.code : null;
  if (code && COLUMN_MISSING_CODES.has(code)) return true;
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return message.includes("column") && message.includes("does not exist");
};

export type SupabaseAuthUser = {
  id: string;
  email: string | null;
  user_metadata?: Record<string, UntypedJson> | null;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  metadata?: Record<string, UntypedJson> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OrganizationMemberRow = {
  id: string | number;
  organization_id: string;
  user_id: string | number;
  role: string;
  created_at: string | null;
  user: {
    id: string;
    email?: string | null;
    primary_email?: string | null;
    supabase_uid?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type OrganizationResponse = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  metadata: Record<string, UntypedJson> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrganizationMemberResponse = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

export function getAdminClient(): SupabaseClient {
  return getSupabaseAdminClient();
}

type OrganizationMembershipQueryRow = {
  organization: OrganizationRow | OrganizationRow[] | null;
  role: string;
  created_at: string | null;
  id: string | number;
};

type OrganizationMembership = {
  organization: OrganizationRow;
  role: string;
  created_at: string | null;
  id: string | number;
};

const isMembership = (row: OrganizationMembership | null): row is OrganizationMembership => row !== null;

const normalizeMembershipRow = (
  row: OrganizationMembershipQueryRow,
): OrganizationMembership | null => {
  const organization = Array.isArray(row.organization) ? row.organization[0] ?? null : row.organization;

  if (!organization) {
    return null;
  }

  return {
    organization,
    role: row.role,
    created_at: row.created_at ?? null,
    id: row.id,
  };
};

type LegacyUserRow = {
  id: number;
  email: string | null;
  primary_email: string | null;
  supabase_uid: string | null;
};

async function fetchLegacyUserRow(
  admin: SupabaseClient,
  supabaseUid: string,
): Promise<LegacyUserRow | null> {
  const { data, error } = await admin
    .from("user")
    .select("id,email,primary_email,supabase_uid")
    .eq("supabase_uid", supabaseUid)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LegacyUserRow) ?? null;
}

function resolveWorkspaceName(user: SupabaseAuthUser): string {
  const metadataName =
    user.user_metadata && typeof user.user_metadata.workspace_name === "string"
      ? user.user_metadata.workspace_name.trim()
      : null;
  const emailPrefix = user.email ? user.email.split("@")[0] : null;
  const base = metadataName || emailPrefix || `user-${user.id.slice(0, 8)}`;
  return `${base.replace(/(^|\\s)([a-z])/g, (_, sep, letter) => `${sep}${letter.toUpperCase()}`)} Workspace`;
}

export async function fetchAuthUser(admin: SupabaseClient, supabaseUid: string): Promise<SupabaseAuthUser | null> {
  const { data, error } = await admin.auth.admin.getUserById(supabaseUid).catch((err) => {
    // If the error is 'User not found', treat it as no user
    if ((err)?.code === 'user_not_found' || (err)?.status === 404) {
      return { data: { user: null }, error: null };
    }
    throw err;
  });

  if (error) {
     // specialized check if catch didn't catch it structure wise
     if ((error)?.code === 'user_not_found' || (error)?.status === 404) {
         return null;
     }
    throw error;
  }
  const user = data?.user;
  if (!user) return null;
  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : null,
    user_metadata:
      (user.user_metadata as Record<string, UntypedJson> | null | undefined) ?? null,
  };
}

export function slugify(value: string, fallback = "org"): string {
  const candidate = (value || "").trim().toLowerCase().replace(SLUG_REGEX, "-").replace(/^-+|-+$/g, "");
  const result = candidate.length > 0 ? candidate : fallback;
  return result.slice(0, 140);
}

export async function generateUniqueSlug(
  admin: SupabaseClient,
  baseSlug: string,
  excludeOrganizationId?: string,
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const orgBuilder = admin.from("org").select("id").eq("slug", candidate).limit(1);
    const { data: orgRow, error: orgError } = excludeOrganizationId
      ? await orgBuilder.neq("id", excludeOrganizationId).maybeSingle()
      : await orgBuilder.maybeSingle();

    if (orgError && !isMissingRelation(orgError) && !isMissingColumn(orgError)) {
      throw orgError;
    }

    if (!orgError && !orgRow) {
      return candidate;
    }

    if (isMissingColumn(orgError)) {
      return candidate;
    }

    if (isMissingRelation(orgError)) {
      const builder = admin.from("organization").select("id").eq("slug", candidate).limit(1);
      const { data, error } = excludeOrganizationId
        ? await builder.neq("id", excludeOrganizationId).maybeSingle()
        : await builder.maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return candidate;
      }
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export function mapOrganization(row: OrganizationRow): OrganizationResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    logo: row.logo_url ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function mapMember(row: OrganizationMemberRow): OrganizationMemberResponse {
  const user = row.user;
  const email = user?.email ?? user?.primary_email ?? null;
  const name = email ? email.split("@")[0] : null;
  const supabaseUid = user?.supabase_uid ?? user?.id ?? null;
  const resolvedUserId = supabaseUid ?? String(row.user_id ?? "");

  return {
    id: String(row.id),
    organizationId: row.organization_id,
    userId: resolvedUserId,
    role: row.role,
    createdAt: row.created_at,
    user: {
      id: resolvedUserId,
      name,
      email,
      image: user?.avatar_url ?? null,
    },
  };
}

type OrganizationMemberQueryRow = Omit<OrganizationMemberRow, "user"> & {
  user: OrganizationMemberRow["user"] | OrganizationMemberRow["user"][] | null;
};

const normalizeMemberRow = (row: OrganizationMemberQueryRow): OrganizationMemberRow => ({
  ...row,
  user: Array.isArray(row.user) ? row.user[0] ?? null : row.user ?? null,
});

export async function listOrganizationMembers(
  admin: SupabaseClient,
  organizationId: string,
): Promise<OrganizationMemberResponse[]> {
  const { data: orgMembers, error: orgError } = await admin
    .from("org_member")
    .select("id, org_id, user_id, role, created_at")
    .eq("org_id", organizationId)
    .order("created_at", { ascending: true });

  if (!orgError) {
    const rows = (orgMembers ?? []) as Array<{
      id: string;
      org_id: string;
      user_id: string;
      role: string;
      created_at: string | null;
    }>;

    const userLookups = await Promise.all(
      rows.map(async (row) => {
        const { data, error } = await admin.auth.admin.getUserById(row.user_id);
        if (error || !data?.user) return [row.user_id, null] as const;
        return [
          row.user_id,
          {
            id: data.user.id,
            email: data.user.email ?? null,
            supabase_uid: data.user.id,
            avatar_url:
              typeof (data.user.user_metadata as Record<string, UntypedJson> | null | undefined)?.avatar_url === "string"
                ? ((data.user.user_metadata as Record<string, UntypedJson>).avatar_url as string)
                : null,
          },
        ] as const;
      }),
    );

    const userMap = new Map(userLookups);

    return rows.map((row) =>
      mapMember({
        id: row.id,
        organization_id: row.org_id,
        user_id: row.user_id,
        role: row.role,
        created_at: row.created_at ?? null,
        user: userMap.get(row.user_id) ?? null,
      }),
    );
  }

  if (!isMissingRelation(orgError)) {
    throw orgError;
  }

  const { data, error } = await admin
    .from("organization_member")
    .select(
      "id, organization_id, user_id, role, created_at, user:user_id (id, email, primary_email, supabase_uid, avatar_url)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as OrganizationMemberQueryRow[])
    .map(normalizeMemberRow)
    .map(mapMember);
}

export async function listUserOrganizations(admin: SupabaseClient, userId: string) {
  type OrgMemberRow = {
    id: string;
    org_id: string;
    user_id: string;
    role: string;
    created_at: string | null;
  };

  const { data: memberRows, error: memberError } = await admin
    .from("org_member")
    .select("id, org_id, user_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (memberError) {
    if (!isMissingRelation(memberError)) {
      throw memberError;
    }

    const legacyUser = await fetchLegacyUserRow(admin, userId);
    if (!legacyUser) return [];

    const { data, error } = await admin
      .from("organization_member")
      .select("organization (id,name,slug,logo_url,metadata,created_at,updated_at), role, created_at, id")
      .eq("user_id", legacyUser.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return ((data ?? []) as OrganizationMembershipQueryRow[])
      .map(normalizeMembershipRow)
      .filter(isMembership);
  }

  const orgIds = Array.from(
    new Set((memberRows ?? []).map((row) => row.org_id).filter(Boolean)),
  );

  if (orgIds.length === 0) {
    return [];
  }

  const { data: orgRows, error: orgError } = await admin
    .from("org")
    .select("*")
    .in("id", orgIds);

  if (orgError) {
    throw orgError;
  }

  const orgMap = new Map(
    (orgRows ?? []).map((row) => [String((row as OrganizationRow).id), row as OrganizationRow]),
  );

  return ((memberRows ?? []) as OrgMemberRow[])
    .map((row) => {
      const org = orgMap.get(row.org_id);
      if (!org) return null;
      return {
        organization: org,
        role: row.role,
        created_at: row.created_at ?? null,
        id: row.id,
      };
    })
    .filter(isMembership);
}

export async function createDefaultOrganization(admin: SupabaseClient, user: SupabaseAuthUser) {
  const workspaceName = resolveWorkspaceName(user);
  const orgId = randomUUID();
  const baseSlug = slugify(user.email?.split("@")[0] ?? workspaceName, `org-${user.id.slice(0, 8)}`);
  const slug = await generateUniqueSlug(admin, baseSlug);

  const { data: insertedOrg, error: insertError } = await admin
    .from("org")
    .insert({
      id: orgId,
      name: workspaceName,
      slug,
    })
    .select("*")
    .single();

  if (insertError) {
    if (!isMissingRelation(insertError)) {
      throw insertError;
    }

    const legacyUser = await fetchLegacyUserRow(admin, user.id);
    if (!legacyUser) {
      throw insertError;
    }

    const baseName = legacyUser.email?.split("@")[0] ?? `user-${legacyUser.id}`;
    const legacyWorkspaceName = `${baseName.replace(/(^|\\s)([a-z])/g, (_, sep, letter) => `${sep}${letter.toUpperCase()}`)} Workspace`;
    const baseSlug = slugify(baseName, `org-${legacyUser.id}`);
    const slug = await generateUniqueSlug(admin, baseSlug);

    const { data, error } = await admin
      .from("organization")
      .insert({
        name: legacyWorkspaceName,
        slug,
        owner_id: legacyUser.id,
      })
      .select("id,name,slug,logo_url,metadata,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    const { error: membershipError } = await admin.from("organization_member").insert({
      organization_id: (data as OrganizationRow).id,
      user_id: legacyUser.id,
      role: "owner",
    });

    if (membershipError) {
      throw membershipError;
    }

    return data as OrganizationRow;
  }

  const { error: membershipError } = await admin.from("org_member").insert({
    org_id: orgId,
    user_id: user.id,
    role: "owner",
  });

  if (membershipError) {
    throw membershipError;
  }

  return insertedOrg as OrganizationRow;
}
