import { z } from "zod";

import { jsonRecordSchema } from "@/lib/validation/json";

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const solAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const legacyAssetTypeSchema = z.enum(["crypto", "nft"]);
const universalAssetTypeSchema = z.enum(["EVM_ERC20", "EVM_NFT", "SOL_SPL", "SOL_NFT", "UNKNOWN"]);

const sourceUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), "sourceUrl must be http(s)")
  .transform((value) => value.trim());

const evidenceSchema = z.array(jsonRecordSchema).max(25).optional();

const metadataSchema = jsonRecordSchema.optional();

const legacyWatchlistItemSchema = z
  .object({
    assetId: z.string().min(1, "Asset id is required").trim(),
    assetType: legacyAssetTypeSchema,
    symbol: z.string().trim().min(1).max(32).optional(),
    displayName: z.string().trim().min(1).max(120).optional(),
    source: z.string().trim().min(1).max(120).default("coingecko"),
    metadata: metadataSchema,
  })
  .transform((payload) => ({
    assetId: payload.assetId.trim().toLowerCase(),
    assetType: payload.assetType,
    symbol: payload.symbol?.trim() ?? null,
    displayName: payload.displayName?.trim() ?? null,
    source: payload.source.trim() || "coingecko",
    metadata: payload.metadata ?? {},
    chainName: null,
    chainId: null,
    addressOrMint: null,
    tokenId: null,
    name: null,
    logoUrl: null,
    sourceSite: payload.source.trim() || "coingecko",
    sourceUrl: null,
    confidence: null,
    evidence: null,
  }));

const universalWatchlistItemSchema = z
  .object({
    assetType: universalAssetTypeSchema,
    chainName: z.string().trim().min(1).max(64),
    chainId: z.number().int().positive().optional(),
    addressOrMint: z.string().trim().min(1).max(128).optional(),
    tokenId: z.string().trim().min(1).max(120).optional(),
    assetId: z.string().trim().min(1).optional(),
    symbol: z.string().trim().min(1).max(32).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    displayName: z.string().trim().min(1).max(120).optional(),
    logoUrl: z.string().trim().url().optional(),
    source: z.string().trim().min(1).max(120).default("extension"),
    sourceSite: z.string().trim().min(1).max(120),
    sourceUrl: sourceUrlSchema,
    confidence: z.number().min(0).max(1),
    evidence: evidenceSchema,
    metadata: metadataSchema,
  })
  .superRefine((payload, ctx) => {
    if (payload.assetType !== "UNKNOWN") {
      if (!payload.addressOrMint) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "addressOrMint is required" });
        return;
      }
      const address = payload.addressOrMint.trim();
      const isEvm = payload.assetType.startsWith("EVM_");
      const isSol = payload.assetType.startsWith("SOL_");
      if (isEvm && !evmAddressRegex.test(address)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid EVM address format" });
      }
      if (isSol && !solAddressRegex.test(address)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid Solana mint format" });
      }
    }
  })
  .transform((payload) => {
    const normalizedChain = payload.chainName.trim().toLowerCase();
    const address = payload.addressOrMint?.trim() ?? null;
    const normalizedAddress =
      payload.assetType.startsWith("EVM_") && address ? address.toLowerCase() : address;
    const tokenId = payload.tokenId?.trim() ?? null;
    const assetId =
      payload.assetId?.trim().toLowerCase() ??
      (normalizedChain && normalizedAddress
        ? `${normalizedChain}:${normalizedAddress}${tokenId ? `:${tokenId}` : ""}`
        : `${normalizedChain}:unknown`);

    return {
      assetId,
      assetType: payload.assetType,
      symbol: payload.symbol?.trim() ?? null,
      name: payload.name?.trim() ?? null,
      displayName: payload.displayName?.trim() ?? payload.name?.trim() ?? payload.symbol?.trim() ?? null,
      logoUrl: payload.logoUrl?.trim() ?? null,
      source: payload.source.trim() || "extension",
      sourceSite: payload.sourceSite.trim(),
      sourceUrl: payload.sourceUrl,
      confidence: payload.confidence,
      evidence: payload.evidence ?? [],
      metadata: payload.metadata ?? {},
      chainName: normalizedChain,
      chainId: payload.chainId ?? null,
      addressOrMint: normalizedAddress,
      tokenId,
    };
  });

export const watchlistItemInputSchema = z.union([legacyWatchlistItemSchema, universalWatchlistItemSchema]);

export type WatchlistItemInput = z.input<typeof watchlistItemInputSchema>;
export type WatchlistItemNormalized = z.output<typeof watchlistItemInputSchema>;

export const removeWatchlistItemSchema = z.object({
  itemId: z.string().uuid("Watchlist item id must be a valid UUID"),
});

export type RemoveWatchlistItemInput = z.infer<typeof removeWatchlistItemSchema>;
