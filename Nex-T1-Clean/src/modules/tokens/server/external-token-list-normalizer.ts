import { z } from "zod";

import { getChainInfo, resolveChainId, SOLANA_CHAIN_ID } from "@/modules/tokens/chains";
import type { TokenRegistryEntry } from "@/modules/tokens/types";
import type { ExternalTokenListSource } from "@/modules/tokens/server/external-token-list-sources";

const externalTokenSchema = z.object({
  address: z.string(),
  chainId: z.number().int().positive(),
  decimals: z.number().int().min(0).max(255),
  logoURI: z.string().url().optional(),
  name: z.string().min(1),
  priceUSD: z.string().optional(),
  symbol: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toTags(value: unknown, sourceId: string): string[] {
  const tags = Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];
  return Array.from(new Set(["external", sourceId, ...tags]));
}

function extractTokenRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map(asRecord).filter((record): record is Record<string, unknown> => Boolean(record));
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  if (Array.isArray(record.tokens)) {
    return record.tokens
      .map(asRecord)
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  return Object.values(record)
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function resolveEntryChainId(
  source: ExternalTokenListSource,
  item: Record<string, unknown>,
): number | null {
  const directChainId = resolveChainId(toString(item.chainId) ?? toNumber(item.chainId) ?? undefined);
  if (directChainId) {
    return directChainId;
  }

  const chainName = resolveChainId(
    toString(item.chain) ?? toString(item.network) ?? toString(item.platform) ?? undefined,
  );
  if (chainName) {
    return chainName;
  }

  return source.defaultChainId ?? null;
}

function normalizeEntry(
  source: ExternalTokenListSource,
  item: Record<string, unknown>,
): TokenRegistryEntry | null {
  const chainId = resolveEntryChainId(source, item);
  if (!chainId || !getChainInfo(chainId)) {
    return null;
  }

  const address =
    toString(item.address) ??
    (chainId === SOLANA_CHAIN_ID ? toString(item.id) : null) ??
    toString(item.mint);
  const name = toString(item.name);
  const symbol = toString(item.symbol);
  const decimals = toNumber(item.decimals);

  if (!address || !name || !symbol || decimals === null) {
    return null;
  }

  const parsed = externalTokenSchema.safeParse({
    address,
    chainId,
    decimals,
    logoURI:
      toString(item.logoURI) ??
      toString(item.icon) ??
      toString(item.logo) ??
      toString(item.image) ??
      toString(item.thumbnail) ??
      undefined,
    name,
    priceUSD: toNumber(item.usdPrice ?? item.priceUSD ?? item.price)?.toString(),
    symbol,
    tags: toTags(item.tags, source.id),
  });

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    sources: ["external"],
    supportStatus: "unsupported",
    safetyStatus: "non_default",
    keywords: [source.id, source.name.toLowerCase(), parsed.data.symbol.toLowerCase()],
  };
}

export function normalizeExternalTokenListPayload(
  source: ExternalTokenListSource,
  payload: unknown,
): TokenRegistryEntry[] {
  return extractTokenRecords(payload)
    .map((item) => normalizeEntry(source, item))
    .filter((entry): entry is TokenRegistryEntry => Boolean(entry));
}
