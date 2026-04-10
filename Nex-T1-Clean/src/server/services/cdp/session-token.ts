import "server-only";

import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { z } from "zod";

import { logger } from "@/lib/logger";

const SESSION_TOKEN_URL = "https://api.developer.coinbase.com/onramp/v1/token";
const SESSION_TOKEN_HOST = "api.developer.coinbase.com";
const SESSION_TOKEN_PATH = "/onramp/v1/token";
const REQUEST_TIMEOUT_MS = 15_000;

const sessionTokenRequestSchema = z.object({
  addresses: z.array(
    z.object({
      address: z.string().min(1, "Address is required"),
      blockchains: z.array(z.string().min(1)).min(1, "At least one blockchain is required"),
    }),
  ).min(1, "At least one address is required"),
  assets: z.array(z.string().min(1)).optional(),
  clientIp: z.string().min(1, "Client IP is required for Coinbase secure initialization"),
});

type SessionTokenApiResponse = {
  token?: string;
  channel_id?: string;
  data?: {
    token?: string;
    channel_id?: string;
  };
};

export type CreateCdpSessionTokenParams = z.infer<typeof sessionTokenRequestSchema>;

export type CreateCdpSessionTokenResult = {
  token: string;
  channelId?: string;
};

function getCdpApiCredentials(): { apiKeyId: string; apiKeySecret: string } {
  const apiKeyId = process.env.CDP_API_KEY_ID?.trim();
  const apiKeySecret = process.env.CDP_API_KEY_SECRET?.trim();

  if (!apiKeyId || !apiKeySecret) {
    throw new Error(
      "CDP secure initialization is not configured. Set CDP_API_KEY_ID and CDP_API_KEY_SECRET.",
    );
  }

  return { apiKeyId, apiKeySecret };
}

export async function createCdpSessionToken(
  params: CreateCdpSessionTokenParams,
): Promise<CreateCdpSessionTokenResult> {
  const payload = sessionTokenRequestSchema.parse(params);
  const { apiKeyId, apiKeySecret } = getCdpApiCredentials();

  const bearerToken = await generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: "POST",
    requestHost: SESSION_TOKEN_HOST,
    requestPath: SESSION_TOKEN_PATH,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(SESSION_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      logger.error("cdp_session_token_request_failed", {
        status: response.status,
        error: errorText.slice(0, 500),
      });
      throw new Error(
        `Coinbase session token request failed: ${response.status} ${errorText.slice(0, 200)}`,
      );
    }

    const body = (await response.json()) as SessionTokenApiResponse;
    const token = body.token ?? body.data?.token;

    if (!token) {
      throw new Error("Coinbase session token response missing token");
    }

    return {
      token,
      channelId: body.channel_id ?? body.data?.channel_id,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Coinbase session token request timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
