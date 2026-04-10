import "server-only";

import { hashApiKeySecret } from "@/server/security/api-key-utils";
import {
  findApiKeyByHashedSecret,
  getProjectUsageSnapshot,
  touchApiKeyUsage,
} from "@/server/services/developer-api/repository";
import {
  listPublicProducts,
} from "@/server/services/developer-api/product-registry";
import type {
  DeveloperApiAuthResult,
  PublicDeveloperProductId,
} from "@/server/services/developer-api/types";

function unauthorized(code: string, message: string): DeveloperApiAuthResult {
  return { ok: false, status: 401, code, message };
}

function forbidden(code: string, message: string): DeveloperApiAuthResult {
  return { ok: false, status: 403, code, message };
}

function paymentRequired(code: string, message: string): DeveloperApiAuthResult {
  return { ok: false, status: 402, code, message };
}

function tooManyRequests(code: string, message: string): DeveloperApiAuthResult {
  return { ok: false, status: 429, code, message };
}

function parseBearerSecret(
  authorizationHeader: string | null | undefined,
): string | null {
  if (!authorizationHeader) return null;
  const [scheme, secret] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !secret?.startsWith("nex_")) {
    return null;
  }
  return secret;
}

export async function authenticatePublicApiKey(args: {
  authorizationHeader: string | null | undefined;
  productId?: PublicDeveloperProductId;
  requestIp: string;
}): Promise<DeveloperApiAuthResult> {
  const secret = parseBearerSecret(args.authorizationHeader);
  if (!secret) {
    return unauthorized("MISSING_API_KEY", "A Bearer nex_* API key is required.");
  }

  const apiKey = await findApiKeyByHashedSecret(hashApiKeySecret(secret));
  if (!apiKey) {
    return unauthorized("INVALID_API_KEY", "The provided API key is not valid.");
  }

  if (apiKey.revokedAt) {
    return unauthorized("API_KEY_REVOKED", "The provided API key has been revoked.");
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) {
    return unauthorized("API_KEY_EXPIRED", "The provided API key has expired.");
  }

  if (!apiKey.projectId || !apiKey.project) {
    return forbidden(
      "PROJECT_REQUIRED",
      "This API key is not attached to a developer project.",
    );
  }

  const allowedProducts =
    apiKey.allowedProducts ?? listPublicProducts().map((product) => product.id);
  if (args.productId && !allowedProducts.includes(args.productId)) {
    return forbidden(
      "PRODUCT_NOT_ALLOWED",
      `This API key is not allowed to call ${args.productId}.`,
    );
  }

  const usageSnapshot = await getProjectUsageSnapshot(apiKey.projectId);
  if (
    apiKey.dailyQuota !== null &&
    usageSnapshot.dailyCreditsUsed >= apiKey.dailyQuota
  ) {
    return tooManyRequests(
      "DAILY_QUOTA_EXCEEDED",
      "This API key has exhausted its daily credit allowance.",
    );
  }

  if (
    apiKey.monthlyQuota !== null &&
    usageSnapshot.monthlyCreditsUsed >= apiKey.monthlyQuota
  ) {
    return paymentRequired(
      "MONTHLY_QUOTA_EXCEEDED",
      "This API key has exhausted its monthly credit allowance.",
    );
  }

  if (
    apiKey.project.hardCapUsd !== null &&
    usageSnapshot.monthlySpendUsd >= apiKey.project.hardCapUsd
  ) {
    return paymentRequired(
      "PROJECT_SPEND_CAP_EXCEEDED",
      "This project has reached its configured hard spend cap.",
    );
  }

  const billingHardSpendCapUsd = apiKey.billingAccount?.hardSpendCapUsd ?? null;
  if (
    billingHardSpendCapUsd !== null &&
    usageSnapshot.monthlySpendUsd >= billingHardSpendCapUsd
  ) {
    return paymentRequired(
      "BILLING_SPEND_CAP_EXCEEDED",
      "This billing account has reached its configured hard spend cap.",
    );
  }

  await touchApiKeyUsage(apiKey.id);

  return {
    ok: true,
    context: {
      apiKeyId: apiKey.id,
      ownerType: apiKey.ownerType,
      ownerId: apiKey.ownerId,
      projectId: apiKey.projectId,
      billingAccountId: apiKey.billingAccountId,
      allowedProducts,
      rateLimit: {
        requests: apiKey.rateLimitRequests,
        windowSeconds: apiKey.rateLimitWindowSeconds,
      },
      tier: apiKey.tier,
      requestIp: args.requestIp,
      quotas: {
        daily: apiKey.dailyQuota,
        monthly: apiKey.monthlyQuota,
      },
      usageSnapshot,
      project: apiKey.project,
      billingAccount: apiKey.billingAccount,
    },
  };
}
