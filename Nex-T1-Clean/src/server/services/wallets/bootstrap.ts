import "server-only";

import type { CrossmintChainType } from "@/server/services/crossmint/wallets";
import { provisionCrossmintWalletForUser } from "@/server/services/crossmint/wallets";
import { provisionCdpWalletsForUser } from "@/server/services/cdp/provision";
import { enqueueJob } from "@/server/queues/enqueue";

import { logger } from "@/lib/logger";

type TriggerWalletBootstrapParams = {
  userId: string;
  email?: string | null;
  source: string;
};

export type UserWalletBootstrapPayload = TriggerWalletBootstrapParams;

const CROSSMINT_CHAINS: readonly CrossmintChainType[] = ["solana", "stellar"] as const;

function isCdpEnabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_ENABLE_CDP_WALLETS ??
    process.env.ENABLE_CDP_WALLETS ??
    "";
  return raw.trim().toLowerCase() === "true";
}

function isCrossmintEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_CROSSMINT_WALLETS ?? process.env.ENABLE_CROSSMINT_WALLETS ?? "";
  if (raw.trim().toLowerCase() !== "true") {
    return false;
  }

  const apiKey = process.env.CROSSMINT_API_KEY?.trim() ?? process.env.CROSSMINT_SERVER_API_KEY?.trim() ?? "";
  return apiKey.length > 0;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const value = typeof email === "string" ? email.trim() : "";
  return value.length > 0 ? value : null;
}

async function runCdpProvision(params: {
  userId: string;
  email: string | null;
  source: string;
}) {
  if (!isCdpEnabled()) {
    return;
  }

  try {
    await provisionCdpWalletsForUser({
      userId: params.userId,
      email: params.email,
    });
  } catch (error) {
    logger.error("wallet_bootstrap_cdp_provision_failed", {
      userId: params.userId,
      source: params.source,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function runCrossmintProvision(params: {
  userId: string;
  email: string | null;
  source: string;
}) {
  if (!isCrossmintEnabled()) {
    return;
  }

  if (!params.email) {
    logger.warn("wallet_bootstrap_crossmint_skipped_missing_email", {
      userId: params.userId,
      source: params.source,
    });
    return;
  }

  await Promise.all(
    CROSSMINT_CHAINS.map(async (chainType) => {
      try {
        await provisionCrossmintWalletForUser({
          userId: params.userId,
          email: params.email,
          chainType,
        });
      } catch (error) {
        logger.error("wallet_bootstrap_crossmint_provision_failed", {
          userId: params.userId,
          source: params.source,
          chainType,
          error,
        });
      }
    }),
  );
}

export async function runUserWalletBootstrap(
  params: TriggerWalletBootstrapParams,
): Promise<void> {
  if (!params.userId) {
    return;
  }

  const email = normalizeEmail(params.email);

  await Promise.all([
    runCdpProvision({
      userId: params.userId,
      email,
      source: params.source,
    }),
    runCrossmintProvision({
      userId: params.userId,
      email,
      source: params.source,
    }),
  ]);
}

export function triggerUserWalletBootstrap(params: TriggerWalletBootstrapParams): void {
  if (!params.userId) {
    return;
  }

  const email = normalizeEmail(params.email);

  void enqueueJob("user_wallet_bootstrap", {
    userId: params.userId,
    email,
    source: params.source,
  }).catch((error) => {
    logger.error("wallet_bootstrap_enqueue_failed", {
      userId: params.userId,
      source: params.source,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
