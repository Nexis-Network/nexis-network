import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";
import {
  refreshNativeBalance,
  type NativeBalanceChainKind,
} from "@/server/wallets/native-balance-cache";
import {
  runUserWalletBootstrap,
  type UserWalletBootstrapPayload,
} from "@/server/services/wallets/bootstrap";
import { processQueuedEnsSubnameClaim } from "@/server/services/ens/subnames";

import { logger } from "@/lib/logger";

// NOTE: Agent task execution uses the dedicated Redis queue in src/server/tasks/queue.ts.
// Do NOT add task execution jobs here — all task enqueue/dequeue flows go through
// enqueueTaskJob / dequeueTaskJobs to avoid dual-queue message loss.
export type JobName =
  | "user_wallet_bootstrap"
  | "native_balance_refresh"
  | "ens_subname_claim";

export type NativeBalanceRefreshPayload = {
  kind: NativeBalanceChainKind;
  address: string;
  chainId?: number | null;
};

export type JobPayloadMap = {
  user_wallet_bootstrap: UserWalletBootstrapPayload;
  native_balance_refresh: NativeBalanceRefreshPayload;
  ens_subname_claim: { userId: string };
};

type Handler<K extends JobName> = (payload: JobPayloadMap[K]) => Promise<void>;

type Handlers = {
  [K in JobName]: Handler<K>;
};

const handlers: Handlers = {
  user_wallet_bootstrap: async (payload) => {
    await runUserWalletBootstrap(payload);
    await invalidateUserWalletsCache(payload.userId).catch(() => {});
    logger.info("[jobs] user wallet bootstrap completed", {
      userId: payload.userId,
    });
  },
  native_balance_refresh: async (payload) => {
    const { kind, address, chainId } = payload;
    if (!kind || !address) return;
    await refreshNativeBalance({
      chainKind: kind,
      address,
      chainId: typeof chainId === "number" ? chainId : undefined,
    }).catch(() => null);
  },
  ens_subname_claim: async (payload) => {
    if (!payload.userId) return;
    await processQueuedEnsSubnameClaim(payload.userId);
  },
};

export async function runJobInline<K extends JobName>(
  name: K,
  payload: JobPayloadMap[K],
) {
  const handler = handlers[name];
  if (!handler) return;
  await handler(payload);
}

export function serializeJob<K extends JobName>(
  name: K,
  payload: JobPayloadMap[K],
): string {
  return JSON.stringify({ name, payload });
}

export function deserializeJob(
  raw: string,
): { name: JobName; payload: JobPayloadMap[JobName] } | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.name ||
      !parsed.payload
    )
      return null;
    return parsed as { name: JobName; payload: JobPayloadMap[JobName] };
  } catch {
    return null;
  }
}
