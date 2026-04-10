import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  generateApiKeySecret,
  hashApiKeySecret,
  mapApiKeyRecord,
  type ApiKeyRecord,
} from "@/server/security/api-key-utils";
import { resolveApiAccessTier, tierLimits } from "@/server/security/api-key-tiers";
import {
  normalizeAllowedProducts,
  validateApiKeyProjectBinding,
  type ApiKeyProjectBindingSupabaseClient,
} from "@/app/api/auth/api-key/route.helpers";


import { logger } from '@/lib/logger';
type CreatePayload = {
  name?: UntypedJson;
  expiresIn?: UntypedJson;
  metadata?: UntypedJson;
  ownerType?: UntypedJson;
  ownerId?: UntypedJson;
  organizationId?: UntypedJson;
  tier?: UntypedJson;
  projectId?: UntypedJson;
  allowedProducts?: UntypedJson;
};

const MAX_EXPIRATION_SECONDS = 60 * 60 * 24 * 365; // 1 year safeguard

const isMissingRelationError = (error: { code?: string | null; message?: string | null } | null | undefined) => {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST106") return true;
  const message = (error.message ?? "").toLowerCase();
  return message.includes("relation") && message.includes("does not exist");
};

export async function POST(request: Request) {
  return withAuthedSupabase(async ({ cookieBridge, supabase, userId, context }) => {
    let body: CreatePayload;
    try {
      body = await request.json() as CreatePayload;
    } catch {
      return cookieBridge.commit(apiResponse.badRequest("API key payload must be valid JSON"));
    }
    const name = typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim() : null;
    const requestedOwnerType =
      typeof body.ownerType === "string" && body.ownerType.toLowerCase() === "organization"
        ? "organization"
        : "user";

    const organizationId =
      typeof body.organizationId === "string" && body.organizationId.trim().length > 0
        ? body.organizationId.trim()
        : typeof body.ownerId === "string" && body.ownerId.trim().length > 0
          ? body.ownerId.trim()
          : null;

    const ownerType = requestedOwnerType === "organization" && organizationId ? "organization" : "user";
    const ownerId = ownerType === "organization" ? organizationId : userId;

    if (!ownerId) {
      return cookieBridge.commit(apiResponse.badRequest("Owner id is required"));
    }

    let expiresAt: string | null = null;
    if (typeof body.expiresIn === "number" && Number.isFinite(body.expiresIn) && body.expiresIn > 0) {
      const bounded = Math.min(body.expiresIn, MAX_EXPIRATION_SECONDS);
      expiresAt = new Date(Date.now() + bounded * 1000).toISOString();
    }

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, UntypedJson>)
        : {};
    const projectId =
      typeof body.projectId === "string" && body.projectId.trim().length > 0
        ? body.projectId.trim()
        : null;
    const allowedProducts = normalizeAllowedProducts(body.allowedProducts);

    let organizationMetadata: Record<string, UntypedJson> | null = null;
    if (ownerType === "organization") {
      try {
        const admin = getSupabaseAdminClient();
        let orgRow: { metadata?: UntypedJson } | null = null;
        const { data, error } = await admin
          .from("org")
          .select("metadata")
          .eq("id", ownerId)
          .maybeSingle();

        if (error && !isMissingRelationError(error)) {
          throw error;
        }

        if (!error) {
          orgRow = data as { metadata?: UntypedJson } | null;
        }

        if (error && isMissingRelationError(error)) {
          const fallback = await admin
            .from("organization")
            .select("metadata")
            .eq("id", ownerId)
            .maybeSingle();

          if (fallback.error) {
            throw fallback.error;
          }

          orgRow = fallback.data as { metadata?: UntypedJson } | null;
        }

        if (!orgRow) {
          return cookieBridge.commit(apiResponse.notFound("Organization not found"));
        }

        organizationMetadata =
          orgRow && typeof orgRow.metadata === "object" && !Array.isArray(orgRow.metadata)
            ? (orgRow.metadata as Record<string, UntypedJson>)
            : null;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unable to verify organization";
        return cookieBridge.commit(apiResponse.internalError(msg));
      }
    }

    const tier = resolveApiAccessTier({
      roles: context.roles,
      userMetadata: (context.claims?.user_metadata as Record<string, UntypedJson> | null) ?? null,
      appMetadata: (context.claims?.app_metadata as Record<string, UntypedJson> | null) ?? null,
      organizationMetadata,
      requestedTier: typeof body.tier === "string" ? body.tier : null,
    });

    const limits = tierLimits(tier);
    const projectSupabase =
      supabase as unknown as ApiKeyProjectBindingSupabaseClient;
    const projectBinding = await validateApiKeyProjectBinding(projectSupabase, {
      projectId,
      ownerType,
      ownerId,
    });
    if (!projectBinding.ok) {
      return cookieBridge.commit(apiResponse.badRequest(projectBinding.message));
    }

    const enrichedMetadata = {
      ...metadata,
      tier,
      rateLimit: {
        requestsPerMinute: limits.rateLimitRequests,
        windowSeconds: limits.rateLimitWindowSeconds,
      },
      quotas: {
        daily: limits.dailyQuota,
          monthly: limits.monthlyQuota,
      },
    };

    try {
      const secret = generateApiKeySecret();
      const hashedSecret = hashApiKeySecret(secret);
      const start = secret.slice(0, 6);
      const prefix = secret.slice(0, 4);

      const { data, error } = await supabase
        .from("api_key")
        .insert({
          owner_type: ownerType,
          owner_id: ownerId,
          name,
          prefix,
          start,
          hashed_secret: hashedSecret,
          metadata: enrichedMetadata,
          tier,
          rate_limit_requests: limits.rateLimitRequests,
          rate_limit_window_seconds: limits.rateLimitWindowSeconds,
          daily_quota: limits.dailyQuota,
          monthly_quota: limits.monthlyQuota,
          project_id: projectId,
          allowed_products: allowedProducts,
          expires_at: expiresAt,
        })
        .select(
          "id,name,start,prefix,owner_type,owner_id,created_at,updated_at,expires_at,metadata,revoked_at,tier,rate_limit_requests,rate_limit_window_seconds,daily_quota,monthly_quota,project_id,last_used_at,allowed_products",
        )
        .single();

      if (error) {
        throw error;
      }

      if (data?.id) {
        await supabase
          .from("api_key_audit")
          .insert({
            api_key_id: data.id,
            event: "created",
            actor_supabase_uid: userId,
            context: name ? { name } : {},
          });
      }

      const mapped = mapApiKeyRecord(data as ApiKeyRecord);
      return cookieBridge.commit(
        apiResponse.success({
          ...mapped,
          key: secret,
        }),
      );
    } catch (error: UntypedJson) {
      logger.error("api_key_create_failed", error instanceof Error ? error.message : String(error));
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("relation") && message.includes("does not exist")) {
        return cookieBridge.commit(
          apiResponse.serviceUnavailable("API key system is currently unavailable (maintenance)."),
        );
      }
      const msg = error instanceof Error ? error.message : "Failed to create API key";
      return cookieBridge.commit(apiResponse.internalError(msg));
    }
  });
}
