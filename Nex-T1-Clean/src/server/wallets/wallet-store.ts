"use server";

import { randomBytes, randomUUID } from "crypto";

import { redis } from "@/server/services/redis";
import { encryptSecret, type VaultCipher } from "@/server/security/wallet-vault";
import type { WalletPortfolio, WalletChainSummary } from "@/lib/user/profile";


import { logger } from '@/lib/logger';
const WALLET_KEY_CURRENT = (userId: string) => `user:${userId}:agent-wallets:v2`;
const WALLET_KEY_LEGACY = (userId: string) => `user:${userId}:agent-wallets`;
const WALLET_ARCHIVE_KEY = (userId: string, walletId: string) => `user:${userId}:agent-wallets:archive:${walletId}`;
const WALLET_METRICS_KEY = "metrics:wallets";

const MAX_AGENT_WALLETS = 20;
const ARCHIVE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_STORE_RETRIES = 5;

export type StoredAgentWallet = {
  id: string;
  chainId: number;
  address: string;
  label?: string | null;
  providerURL?: string | null;
  createdAt: string;
  updatedAt: string;
  secrets: {
    privateKey?: VaultCipher | null;
    mnemonic?: VaultCipher | null;
    encryptedJson?: VaultCipher | null;
  };
  metadata?: Record<string, UntypedJson> | null;
};

export type WalletCreationPayload = {
  chainId: number;
  address: string;
  label?: string | null;
  providerURL?: string | null;
  privateKey?: string | null;
  mnemonic?: string | null;
  encryptedJson?: string | null;
  metadata?: Record<string, UntypedJson> | null;
};

export async function persistAgentWallet(userId: string, payload: WalletCreationPayload) {
  const id = generateWalletId();
  const now = new Date().toISOString();

  const record: StoredAgentWallet = {
    id,
    chainId: payload.chainId,
    address: payload.address,
    label: payload.label ?? null,
    providerURL: payload.providerURL ?? null,
    createdAt: now,
    updatedAt: now,
    secrets: {
      privateKey: payload.privateKey ? encryptSecret(payload.privateKey) : null,
      mnemonic: payload.mnemonic ? encryptSecret(payload.mnemonic) : null,
      encryptedJson: payload.encryptedJson ? encryptSecret(payload.encryptedJson) : null,
    },
    metadata: payload.metadata ?? null,
  };

  const key = WALLET_KEY_CURRENT(userId);
  const lockKey = `${key}:lock`;

  for (let attempt = 0; attempt < MAX_STORE_RETRIES; attempt += 1) {
    const owner = randomUUID();
    const acquired = await redis.trySetNx(lockKey, owner, 5);
    if (!acquired) {
      await new Promise((resolve) => setTimeout(resolve, 50 + attempt * 25));
      continue;
    }

    try {
      const current = await redis.get<string>(key);
      const wallets = parseWalletList(current);

      let removed: StoredAgentWallet | null = null;
      if (wallets.length >= MAX_AGENT_WALLETS) {
        removed = wallets.shift() ?? null;
      }

      wallets.push(record);

      await redis.set(key, JSON.stringify(wallets));
      if (removed) {
        await redis.set(
          WALLET_ARCHIVE_KEY(userId, removed.id),
          JSON.stringify(removed),
          { ex: ARCHIVE_TTL_SECONDS },
        );
      }
      await redis.hincrby(WALLET_METRICS_KEY, "generated", 1);
      await redis.hset(WALLET_METRICS_KEY, {
        last_generated_at: now,
        last_generated_user: userId,
      });

      return record;
    } finally {
      await redis.tryReleaseLock(lockKey, owner).catch(() => {});
    }
  }

  throw new Error("Unable to persist wallet. Please retry.");
}

export async function listStoredWallets(userId: string): Promise<StoredAgentWallet[]> {
  const current = await redis.get<string>(WALLET_KEY_CURRENT(userId));
  if (current) {
    return parseWalletList(current);
  }

  const legacy = await redis.get<string>(WALLET_KEY_LEGACY(userId));
  if (!legacy) {
    return [];
  }

  const parsedLegacy = parseWalletList(legacy);
  await redis.set(WALLET_KEY_CURRENT(userId), JSON.stringify(parsedLegacy)).catch(() => {});
  return parsedLegacy;
}

export async function listWalletPortfolios(userId: string): Promise<WalletPortfolio[]> {
  const wallets = await listStoredWallets(userId);
  return wallets.map((wallet) => ({
    walletId: wallet.id,
    walletType: "agent_generated",
    walletTypeIcon: "/assets/wallet-logos/Safe-Wallet.svg",
    providerName: "Nex Agent Wallet",
    change24hPercent: null,
    gainLoss24hUsd: null,
    topAssets: [],
    topChains: normalizeChain(wallet.chainId),
    netWorthUsd: null,
    address: wallet.address,
    metadata: {
      label: wallet.label ?? null,
      providerURL: wallet.providerURL ?? null,
      createdAt: wallet.createdAt,
      ...(wallet.metadata ?? {}),
    },
  }));
}

function normalizeChain(chainId: number): WalletChainSummary[] {
  switch (chainId) {
    case 1:
      return [{ name: "Ethereum", icon: "/icons/chain-icons/ethereum.svg" }];
    case 10:
      return [{ name: "Optimism", icon: "/icons/chain-icons/optimism.svg" }];
    case 137:
      return [{ name: "Polygon", icon: "/icons/chain-icons/polygon.svg" }];
    case 8453:
      return [{ name: "Base", icon: "/icons/chain-icons/base.svg" }];
    case 42161:
      return [{ name: "Arbitrum One", icon: "/icons/chain-icons/arbitrum.svg" }];
    default: {
      return [{ name: `Chain ${chainId}`, icon: null }];
    }
  }
}

function parseWalletList(raw: UntypedJson): StoredAgentWallet[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw as StoredAgentWallet[];
  }
  if (typeof raw !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAgentWallet[]) : [];
  } catch (error) {
    logger.error("Failed to parse stored agent wallets", error);
    return [];
  }
}

function generateWalletId() {
  return `agent-wallet_${randomBytes(6).toString("hex")}`;
}
