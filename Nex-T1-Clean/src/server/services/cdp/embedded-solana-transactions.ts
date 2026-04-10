import "server-only";

import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";

import { logger } from "@/lib/logger";
import { mintCdpJwt } from "@/server/auth/cdp-jwt-bridge";
import {
  buildCdpCustomAuthRemediationMessage,
  resolveAlignedCdpProjectId,
} from "@/server/services/cdp/project-alignment";

const CDP_API_HOST = "api.cdp.coinbase.com";
const CDP_API_ORIGIN = `https://${CDP_API_HOST}`;
const CDP_EMBEDDED_API_PREFIX = "/platform/v2/embedded-wallet-api";
const REQUEST_TIMEOUT_MS = 15_000;
const WALLET_SECRET_TTL_MS = 60 * 60 * 1000;

type EmbeddedSolanaNetwork = "solana" | "solana-devnet";

type WalletSecretRegistration = {
  walletSecretId: string;
  publicKeyBase64: string;
  privateKeyPem: string;
  validUntil: string;
};

type EmbeddedRequestBody = Record<string, unknown>;

function createRandomHex(byteLength: number): string {
  return randomBytes(byteLength).toString("hex");
}

function sortKeys(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortKeys((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}

async function createWalletSecretRegistration(): Promise<WalletSecretRegistration> {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    privateKeyEncoding: {
      format: "pem",
      type: "pkcs8",
    },
    publicKeyEncoding: {
      format: "der",
      type: "spki",
    },
  });

  return {
    walletSecretId: createRandomHex(16),
    publicKeyBase64: publicKey.toString("base64"),
    privateKeyPem: privateKey,
    validUntil: new Date(Date.now() + WALLET_SECRET_TTL_MS).toISOString(),
  };
}

function buildWalletAuthHeader(args: {
  method: "PUT" | "POST";
  path: string;
  body: EmbeddedRequestBody;
  privateKeyPem: string;
}): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: { uris: string[]; reqHash?: string } = {
    uris: [`${args.method} ${CDP_API_HOST}${args.path}`],
  };

  if (Object.keys(args.body).length > 0) {
    payload.reqHash = createHash("sha256")
      .update(JSON.stringify(sortKeys(args.body)))
      .digest("hex");
  }

  const encodedHeader = Buffer.from(JSON.stringify({ alg: "ES256", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: issuedAt,
      nbf: issuedAt,
      jti: createRandomHex(16),
    }),
  ).toString("base64url");
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: args.privateKeyPem,
    dsaEncoding: "ieee-p1363",
  });

  return `${signingInput}.${signature.toString("base64url")}`;
}

async function fetchEmbeddedJson<T>(args: {
  bearerToken: string;
  method: "PUT" | "POST";
  path: string;
  body: EmbeddedRequestBody;
  privateKeyPem: string;
}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const walletAuthHeader = buildWalletAuthHeader(args);
    const response = await fetch(`${CDP_API_ORIGIN}${args.path}`, {
      method: args.method,
      headers: {
        Authorization: `Bearer ${args.bearerToken}`,
        "Content-Type": "application/json",
        "X-Wallet-Auth": walletAuthHeader,
      },
      body: JSON.stringify(args.body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`${response.status} ${errorText.slice(0, 200)}`.trim());
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendCdpEmbeddedSolanaTransaction(args: {
  userId: string;
  walletAddress: string;
  transaction: string;
  network?: EmbeddedSolanaNetwork;
}): Promise<{ transactionSignature: string }> {
  const projectId = await resolveAlignedCdpProjectId();
  const bearerToken = await mintCdpJwt(args.userId);
  const walletSecret = await createWalletSecretRegistration();
  const registerPath =
    `${CDP_EMBEDDED_API_PREFIX}/projects/${projectId}/end-users/${args.userId}/wallet-secrets`;

  await fetchEmbeddedJson({
    bearerToken,
    method: "PUT",
    path: registerPath,
    body: {
      walletSecretId: walletSecret.walletSecretId,
      publicKey: walletSecret.publicKeyBase64,
      validUntil: walletSecret.validUntil,
    },
    privateKeyPem: walletSecret.privateKeyPem,
  }).catch(async (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("cdp_embedded_wallet_secret_registration_failed", {
      userId: args.userId,
      walletAddress: args.walletAddress,
      error: errorMessage,
    });

    const guidance = errorMessage.includes("Could not find JWK with kid")
      ? ` ${await buildCdpCustomAuthRemediationMessage(projectId)}`
      : "";
    throw new Error(
      `CDP embedded wallet secret registration failed: ${errorMessage}${guidance}`,
    );
  });

  const sendPath =
    `${CDP_EMBEDDED_API_PREFIX}/projects/${projectId}/end-users/${args.userId}/solana/send/transaction`;

  return await fetchEmbeddedJson<{ transactionSignature?: string }>({
    bearerToken,
    method: "POST",
    path: sendPath,
    body: {
      address: args.walletAddress,
      transaction: args.transaction,
      walletSecretId: walletSecret.walletSecretId,
      network: args.network ?? "solana",
    },
    privateKeyPem: walletSecret.privateKeyPem,
  })
    .then((result) => {
      if (!result.transactionSignature?.trim()) {
        throw new Error("Response did not include a transactionSignature.");
      }

      return { transactionSignature: result.transactionSignature.trim() };
    })
    .catch(async (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("cdp_embedded_solana_send_failed", {
        userId: args.userId,
        walletAddress: args.walletAddress,
        error: errorMessage,
      });

      const guidance = errorMessage.includes("Could not find JWK with kid")
        ? ` ${await buildCdpCustomAuthRemediationMessage(projectId)}`
        : "";
      throw new Error(
        `CDP embedded Solana send failed: ${errorMessage}${guidance}`,
      );
    });
}
