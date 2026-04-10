import "server-only";

import pMap from "p-map";

import { defaultHeliusClient } from "@/server/services/mcp/helius-client";
import { timeVendor } from "@/server/instrumentation/metrics";
import { normalizeSolanaAddress } from "@/server/moralis/validation";

export type HeliusMintActivitySummary = {
  signaturesSampleSize: number;
  txDetailsSampleSize: number;
  uniqueFeePayers: number;
  uniqueBuyers: number;
  uniqueBuyLikeBuyers: number;
  uniqueTransferLikeBuyers: number;
  uniqueSellers: number;
  uniqueFreshBuyers: number;
  uniqueFreshBuyLikeBuyers: number;
  buyLikeTxCount: number;
  transferLikeTxCount: number;
  jitoTipTxCount: number;
  maxTxsInSlot: number;
  maxBuyLikeTxsInSlot: number;
  maxUniqueFeePayersInSlot: number;
  maxUniqueBuyersInSlot: number;
  maxUniqueBuyLikeBuyersInSlot: number;
  slotsObserved: number;
  firstSeenUnix: number | null;
  lastSeenUnix: number | null;
  earlyWindowSeconds: number | null;
  earlyTxs: number | null;
  earlyUniqueFeePayers: number | null;
  earlyUniqueBuyers: number | null;
  earlyUniqueFreshBuyers: number | null;
  earlyUniqueBuyLikeBuyers: number | null;
  earlyUniqueFreshBuyLikeBuyers: number | null;
  suspectedBundlerScore: number; // 0..1
  suspectedSniperScore: number; // 0..1
};

type SignatureRow = {
  signature: string;
  slot: number | null;
  blockTime: number | null; // unix seconds
};

function asRecord(value: unknown): Record<string, UntypedJson> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, UntypedJson>) : {};
}

function unwrapToolResult(payload: unknown): UntypedJson {
  const p = asRecord(payload);
  const response = asRecord(p.response);
  const toolResult = (p.toolResult && typeof p.toolResult === "object" ? (p.toolResult as Record<string, UntypedJson>) : null) ??
    (response.toolResult && typeof response.toolResult === "object" ? (response.toolResult as Record<string, UntypedJson>) : null);
  if (toolResult && "result" in toolResult) return toolResult.result;
  return (p.result as UntypedJson) ?? null;
}

function toNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeFeePayerFromGetTransaction(rawTx: UntypedJson): string | null {
  const record = asRecord(rawTx);
  const result = asRecord(record.result ?? rawTx);
  const tx = asRecord(result.transaction);
  const message = asRecord(tx.message);
  const keys = message.accountKeys;
  if (!Array.isArray(keys) || keys.length === 0) return null;
  const first = keys[0] as UntypedJson;
  if (typeof first === "string") {
    try {
      return normalizeSolanaAddress(first);
    } catch {
      return null;
    }
  }
  const firstRec = asRecord(first);
  const pubkey = typeof firstRec.pubkey === "string" ? firstRec.pubkey : null;
  if (!pubkey) return null;
  try {
    return normalizeSolanaAddress(pubkey);
  } catch {
    return null;
  }
}

function parseUiTokenAmount(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Record<string, UntypedJson>;
  // Prefer uiAmount for correct decimals.
  if (typeof r.uiAmount === "number" && Number.isFinite(r.uiAmount)) return r.uiAmount;
  if (typeof r.uiAmountString === "string" && r.uiAmountString.trim().length) {
    const parsed = Number(r.uiAmountString);
    if (Number.isFinite(parsed)) return parsed;
  }
  // Fallback: amount + decimals.
  const amountRaw = r.amount;
  const decimalsRaw = r.decimals;
  const amount = typeof amountRaw === "string" && amountRaw.trim().length ? Number(amountRaw) : typeof amountRaw === "number" ? amountRaw : NaN;
  const decimals = typeof decimalsRaw === "number" && Number.isFinite(decimalsRaw) ? decimalsRaw : NaN;
  if (Number.isFinite(amount) && Number.isFinite(decimals) && decimals >= 0 && decimals <= 18) {
    return amount / 10 ** decimals;
  }
  return null;
}

const WSOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

// Program ids that strongly indicate the tx is a swap rather than a plain token transfer.
// This list is intentionally small and conservative; it is used as a positive signal only.
const DEX_PROGRAM_IDS = new Set<string>([
  // pump.fun
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  // Jupiter v6
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  // Orca Whirlpool
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
]);

function normalizeAccountKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  const out: string[] = [];
  for (const entry of keys) {
    if (typeof entry === "string") {
      try {
        out.push(normalizeSolanaAddress(entry));
      } catch {
        // ignore
      }
      continue;
    }
    const r = asRecord(entry);
    const pubkey = typeof r.pubkey === "string" ? r.pubkey : null;
    if (!pubkey) continue;
    try {
      out.push(normalizeSolanaAddress(pubkey));
    } catch {
      // ignore
    }
  }
  return out;
}

function extractProgramIdsFromGetTransaction(tx: UntypedJson): Set<string> {
  const record = asRecord(tx);
  const result = asRecord(record.result ?? tx);
  const transaction = asRecord(result.transaction);
  const message = asRecord(transaction.message);
  const accountKeys = normalizeAccountKeys(message.accountKeys);
  const instructions = Array.isArray(message.instructions) ? (message.instructions as UntypedJson[]) : [];
  const programIds = new Set<string>();
  for (const ix of instructions) {
    const r = asRecord(ix);
    const programIdIndex = typeof r.programIdIndex === "number" && Number.isFinite(r.programIdIndex) ? Math.trunc(r.programIdIndex) : null;
    if (programIdIndex == null) continue;
    const programId = accountKeys[programIdIndex] ?? null;
    if (programId) programIds.add(programId);
  }
  return programIds;
}

function extractSolDeltaLamportsByAccount(tx: UntypedJson): Map<string, number> {
  const record = asRecord(tx);
  const result = asRecord(record.result ?? tx);
  const transaction = asRecord(result.transaction);
  const message = asRecord(transaction.message);
  const accountKeys = normalizeAccountKeys(message.accountKeys);

  const meta = asRecord(result.meta);
  const pre = Array.isArray(meta.preBalances) ? (meta.preBalances as UntypedJson[]) : [];
  const post = Array.isArray(meta.postBalances) ? (meta.postBalances as UntypedJson[]) : [];
  const out = new Map<string, number>();
  const n = Math.min(accountKeys.length, pre.length, post.length);
  for (let i = 0; i < n; i += 1) {
    const key = accountKeys[i];
    const preLamports = typeof pre[i] === "number" && Number.isFinite(pre[i]) ? (pre[i] as number) : null;
    const postLamports = typeof post[i] === "number" && Number.isFinite(post[i]) ? (post[i] as number) : null;
    if (preLamports == null || postLamports == null) continue;
    out.set(key, (out.get(key) ?? 0) + (postLamports - preLamports));
  }
  return out;
}

function extractUiTokenBalancesByOwnerAndMint(tx: UntypedJson): { pre: Map<string, Map<string, number>>; post: Map<string, Map<string, number>> } {
  const record = asRecord(tx);
  const result = asRecord(record.result ?? tx);
  const meta = asRecord(result.meta);

  const pre = Array.isArray(meta.preTokenBalances) ? (meta.preTokenBalances as UntypedJson[]) : [];
  const post = Array.isArray(meta.postTokenBalances) ? (meta.postTokenBalances as UntypedJson[]) : [];

  const outPre = new Map<string, Map<string, number>>();
  const outPost = new Map<string, Map<string, number>>();

  const ingest = (list: UntypedJson[], target: Map<string, Map<string, number>>) => {
    for (const entry of list) {
      const e = asRecord(entry);
      const owner = typeof e.owner === "string" ? e.owner : null;
      const mint = typeof e.mint === "string" ? e.mint : null;
      if (!owner || !mint) continue;
      const amount = parseUiTokenAmount(e.uiTokenAmount);
      if (amount == null) continue;
      let normalizedOwner: string;
      let normalizedMint: string;
      try {
        normalizedOwner = normalizeSolanaAddress(owner);
        normalizedMint = normalizeSolanaAddress(mint);
      } catch {
        continue;
      }
      const byMint = target.get(normalizedOwner) ?? new Map<string, number>();
      byMint.set(normalizedMint, (byMint.get(normalizedMint) ?? 0) + amount);
      target.set(normalizedOwner, byMint);
    }
  };

  ingest(pre, outPre);
  ingest(post, outPost);

  return { pre: outPre, post: outPost };
}

function getTokenDeltaForOwner(owner: string, mint: string, maps: { pre: Map<string, Map<string, number>>; post: Map<string, Map<string, number>> }): number {
  const preAmt = maps.pre.get(owner)?.get(mint) ?? 0;
  const postAmt = maps.post.get(owner)?.get(mint) ?? 0;
  return postAmt - preAmt;
}

export function classifyMintTxFromGetTransaction(params: {
  tx: UntypedJson;
  mint: string;
  jitoTipAccounts?: string[];
}): {
  buyers: Set<string>;
  sellers: Set<string>;
  freshBuyers: Set<string>;
  buyLikeBuyers: Set<string>;
  transferLikeBuyers: Set<string>;
  jitoTipDetected: boolean;
} {
  const mint = normalizeSolanaAddress(params.mint);

  const tokenMaps = extractUiTokenBalancesByOwnerAndMint(params.tx);
  const owners = new Set<string>([...tokenMaps.pre.keys(), ...tokenMaps.post.keys()]);
  const buyers = new Set<string>();
  const sellers = new Set<string>();
  const freshBuyers = new Set<string>();
  const buyLikeBuyers = new Set<string>();
  const transferLikeBuyers = new Set<string>();

  for (const owner of owners) {
    const preAmt = tokenMaps.pre.get(owner)?.get(mint) ?? 0;
    const postAmt = tokenMaps.post.get(owner)?.get(mint) ?? 0;
    const delta = postAmt - preAmt;
    if (delta > 0) {
      buyers.add(owner);
      if (preAmt === 0) freshBuyers.add(owner);
    } else if (delta < 0) {
      sellers.add(owner);
    }
  }

  const programIds = extractProgramIdsFromGetTransaction(params.tx);
  const dexProgramHit = [...programIds].some((id) => DEX_PROGRAM_IDS.has(id));
  const solDeltas = extractSolDeltaLamportsByAccount(params.tx);

  const normalizedTipAccounts = (params.jitoTipAccounts ?? [])
    .map((v) => {
      try {
        return normalizeSolanaAddress(v);
      } catch {
        return null;
      }
    })
    .filter((v): v is string => Boolean(v));
  const tipSet = new Set<string>(normalizedTipAccounts);
  let jitoTipDetected = false;
  for (const tip of tipSet) {
    const delta = solDeltas.get(tip);
    if (delta != null && delta > 0) {
      jitoTipDetected = true;
      break;
    }
  }

  // Heuristic: a buyer is "buy-like" if the tx looks like a swap (dex program) or the buyer spent SOL/WSOL/stable.
  // This reduces false positives from plain token transfers / airdrops.
  const minSolSpendLamports = 20_000; // above typical fees; keeps this signal conservative
  const minStableSpend = 0.01;
  const minWsolSpend = 0.00001;

  for (const buyer of buyers) {
    const solDelta = solDeltas.get(buyer) ?? 0;
    const spentSol = solDelta <= -minSolSpendLamports;
    const usdcDelta = getTokenDeltaForOwner(buyer, USDC_MINT, tokenMaps);
    const usdtDelta = getTokenDeltaForOwner(buyer, USDT_MINT, tokenMaps);
    const wsolDelta = getTokenDeltaForOwner(buyer, WSOL_MINT, tokenMaps);
    const spentStable = usdcDelta <= -minStableSpend || usdtDelta <= -minStableSpend;
    const spentWsol = wsolDelta <= -minWsolSpend;

    const isBuyLike = dexProgramHit || spentSol || spentStable || spentWsol;
    if (isBuyLike) buyLikeBuyers.add(buyer);
    else transferLikeBuyers.add(buyer);
  }

  return { buyers, sellers, freshBuyers, buyLikeBuyers, transferLikeBuyers, jitoTipDetected };
}

export function summarizeMintActivity(params: {
  signatures: SignatureRow[];
  feePayersBySignature: Record<string, string | null>;
  buyersBySignature?: Record<string, string[]>;
  buyLikeBuyersBySignature?: Record<string, string[]>;
  transferLikeBuyersBySignature?: Record<string, string[]>;
  sellersBySignature?: Record<string, string[]>;
  freshBuyersBySignature?: Record<string, string[]>;
  freshBuyLikeBuyersBySignature?: Record<string, string[]>;
  jitoTipBySignature?: Record<string, boolean>;
  createdAtUnix?: number | null;
  earlyWindowSeconds?: number;
}): HeliusMintActivitySummary {
  const signatures = params.signatures;
  const feePayersBySignature = params.feePayersBySignature;
  const buyersBySignature = params.buyersBySignature ?? {};
  const buyLikeBuyersBySignature = params.buyLikeBuyersBySignature ?? {};
  const transferLikeBuyersBySignature = params.transferLikeBuyersBySignature ?? {};
  const sellersBySignature = params.sellersBySignature ?? {};
  const freshBuyersBySignature = params.freshBuyersBySignature ?? {};
  const freshBuyLikeBuyersBySignature = params.freshBuyLikeBuyersBySignature ?? {};
  const jitoTipBySignature = params.jitoTipBySignature ?? {};

  const bySlot = new Map<number, { count: number; buyLikeCount: number; feePayers: Set<string>; buyers: Set<string>; buyLikeBuyers: Set<string> }>();
  const allFeePayers = new Set<string>();
  const allBuyers = new Set<string>();
  const allBuyLikeBuyers = new Set<string>();
  const allTransferLikeBuyers = new Set<string>();
  const allSellers = new Set<string>();
  const allFreshBuyers = new Set<string>();
  const allFreshBuyLikeBuyers = new Set<string>();
  let buyLikeTxCount = 0;
  let transferLikeTxCount = 0;
  let jitoTipTxCount = 0;

  let firstSeenUnix: number | null = null;
  let lastSeenUnix: number | null = null;

  for (const s of signatures) {
    if (typeof s.blockTime === "number" && Number.isFinite(s.blockTime)) {
      firstSeenUnix = firstSeenUnix == null ? s.blockTime : Math.min(firstSeenUnix, s.blockTime);
      lastSeenUnix = lastSeenUnix == null ? s.blockTime : Math.max(lastSeenUnix, s.blockTime);
    }
    if (typeof s.slot === "number" && Number.isFinite(s.slot)) {
      const slot = s.slot;
      const entry =
        bySlot.get(slot) ?? { count: 0, buyLikeCount: 0, feePayers: new Set<string>(), buyers: new Set<string>(), buyLikeBuyers: new Set<string>() };
      entry.count += 1;
      const fp = feePayersBySignature[s.signature] ?? null;
      if (fp) {
        entry.feePayers.add(fp);
        allFeePayers.add(fp);
      }
      const buyers = buyersBySignature[s.signature] ?? [];
      for (const b of buyers) {
        entry.buyers.add(b);
        allBuyers.add(b);
      }
      const buyLike = buyLikeBuyersBySignature[s.signature] ?? [];
      if (buyLike.length > 0) {
        entry.buyLikeCount += 1;
        buyLikeTxCount += 1;
        for (const b of buyLike) {
          entry.buyLikeBuyers.add(b);
          allBuyLikeBuyers.add(b);
        }
      } else if (buyers.length > 0) {
        transferLikeTxCount += 1;
        const transferLike = transferLikeBuyersBySignature[s.signature] ?? buyers;
        for (const b of transferLike) allTransferLikeBuyers.add(b);
      }
      const sellers = sellersBySignature[s.signature] ?? [];
      for (const w of sellers) allSellers.add(w);
      const fresh = freshBuyersBySignature[s.signature] ?? [];
      for (const w of fresh) allFreshBuyers.add(w);
      const freshBuyLike = freshBuyLikeBuyersBySignature[s.signature] ?? [];
      for (const w of freshBuyLike) allFreshBuyLikeBuyers.add(w);
      if (jitoTipBySignature[s.signature] === true) jitoTipTxCount += 1;
      bySlot.set(slot, entry);
    }
  }

  let maxTxsInSlot = 0;
  let maxBuyLikeTxsInSlot = 0;
  let maxUniqueFeePayersInSlot = 0;
  let maxUniqueBuyersInSlot = 0;
  let maxUniqueBuyLikeBuyersInSlot = 0;
  for (const { count, buyLikeCount, feePayers, buyers, buyLikeBuyers } of bySlot.values()) {
    maxTxsInSlot = Math.max(maxTxsInSlot, count);
    maxBuyLikeTxsInSlot = Math.max(maxBuyLikeTxsInSlot, buyLikeCount);
    maxUniqueFeePayersInSlot = Math.max(maxUniqueFeePayersInSlot, feePayers.size);
    maxUniqueBuyersInSlot = Math.max(maxUniqueBuyersInSlot, buyers.size);
    maxUniqueBuyLikeBuyersInSlot = Math.max(maxUniqueBuyLikeBuyersInSlot, buyLikeBuyers.size);
  }

  const slotsObserved = bySlot.size;

  const bundlerScore = clamp01(
    Math.max(maxUniqueBuyLikeBuyersInSlot / 20, maxBuyLikeTxsInSlot / 25, maxUniqueFeePayersInSlot / 20, maxTxsInSlot / 35),
  );

  const createdAtUnix = params.createdAtUnix ?? null;
  const earlyWindowSeconds = createdAtUnix != null ? (params.earlyWindowSeconds ?? 180) : null;
  let earlyTxs: number | null = null;
  let earlyUniqueFeePayers: number | null = null;
  let earlyUniqueBuyers: number | null = null;
  let earlyUniqueFreshBuyers: number | null = null;
  let earlyUniqueBuyLikeBuyers: number | null = null;
  let earlyUniqueFreshBuyLikeBuyers: number | null = null;
  if (createdAtUnix != null && earlyWindowSeconds != null && earlyWindowSeconds > 0) {
    const cutoff = createdAtUnix + earlyWindowSeconds;
    const earlySigs = signatures.filter((s) => typeof s.blockTime === "number" && s.blockTime >= createdAtUnix && s.blockTime <= cutoff);
    earlyTxs = earlySigs.length;
    const fpSet = new Set<string>();
    const buyerSet = new Set<string>();
    const freshBuyerSet = new Set<string>();
    const buyLikeBuyerSet = new Set<string>();
    const freshBuyLikeBuyerSet = new Set<string>();
    for (const s of earlySigs) {
      const fp = feePayersBySignature[s.signature] ?? null;
      if (fp) fpSet.add(fp);
      for (const b of (buyersBySignature[s.signature] ?? [])) buyerSet.add(b);
      for (const b of (freshBuyersBySignature[s.signature] ?? [])) freshBuyerSet.add(b);
      for (const b of (buyLikeBuyersBySignature[s.signature] ?? [])) buyLikeBuyerSet.add(b);
      for (const b of (freshBuyLikeBuyersBySignature[s.signature] ?? [])) freshBuyLikeBuyerSet.add(b);
    }
    earlyUniqueFeePayers = fpSet.size;
    earlyUniqueBuyers = buyerSet.size;
    earlyUniqueFreshBuyers = freshBuyerSet.size;
    earlyUniqueBuyLikeBuyers = buyLikeBuyerSet.size;
    earlyUniqueFreshBuyLikeBuyers = freshBuyLikeBuyerSet.size;
  }

  const effectiveEarlyBuyers = earlyUniqueBuyLikeBuyers ?? earlyUniqueBuyers;
  const sniperScore =
    createdAtUnix != null && earlyWindowSeconds != null
      ? clamp01(((effectiveEarlyBuyers ?? 0) / 18) * 0.7 + ((earlyTxs ?? 0) / 25) * 0.3)
      : 0;

  return {
    signaturesSampleSize: signatures.length,
    txDetailsSampleSize: Object.keys(feePayersBySignature).length,
    uniqueFeePayers: allFeePayers.size,
    uniqueBuyers: allBuyers.size,
    uniqueBuyLikeBuyers: allBuyLikeBuyers.size,
    uniqueTransferLikeBuyers: allTransferLikeBuyers.size,
    uniqueSellers: allSellers.size,
    uniqueFreshBuyers: allFreshBuyers.size,
    uniqueFreshBuyLikeBuyers: allFreshBuyLikeBuyers.size,
    buyLikeTxCount,
    transferLikeTxCount,
    jitoTipTxCount,
    maxTxsInSlot,
    maxBuyLikeTxsInSlot,
    maxUniqueFeePayersInSlot,
    maxUniqueBuyersInSlot,
    maxUniqueBuyLikeBuyersInSlot,
    slotsObserved,
    firstSeenUnix,
    lastSeenUnix,
    earlyWindowSeconds,
    earlyTxs,
    earlyUniqueFeePayers,
    earlyUniqueBuyers,
    earlyUniqueFreshBuyers,
    earlyUniqueBuyLikeBuyers,
    earlyUniqueFreshBuyLikeBuyers,
    suspectedBundlerScore: bundlerScore,
    suspectedSniperScore: sniperScore,
  };
}

export async function fetchAndSummarizeMintActivity(params: {
  mint: string;
  signatureLimit?: number;
  txDetailLimit?: number;
  concurrency?: number;
  createdAtUnix?: number | null;
}): Promise<HeliusMintActivitySummary | null> {
  const mint = normalizeSolanaAddress(params.mint);
  const signatureLimit = Math.min(200, Math.max(10, params.signatureLimit ?? 80));
  const txDetailLimit = Math.min(60, Math.max(0, params.txDetailLimit ?? 25));
  const concurrency = Math.min(10, Math.max(1, params.concurrency ?? 6));

  const sigsPayload = await timeVendor("helius_get_signatures_for_address", () =>
    defaultHeliusClient.invokeRaw("helius_get_signatures_for_address", { address: mint, limit: signatureLimit }),
  ).catch(() => null);

  if (!sigsPayload) return null;
  const sigsResult = unwrapToolResult(sigsPayload);
  const sigsList = Array.isArray(sigsResult) ? sigsResult : (Array.isArray(asRecord(sigsResult).result) ? (asRecord(sigsResult).result as UntypedJson[]) : []);
  if (!Array.isArray(sigsList) || sigsList.length === 0) {
    return summarizeMintActivity({ signatures: [], feePayersBySignature: {}, createdAtUnix: params.createdAtUnix ?? null });
  }

  const signatures: SignatureRow[] = sigsList
    .map((entry): SignatureRow | null => {
      const e = asRecord(entry);
      const signature = typeof e.signature === "string" ? e.signature : typeof e.sig === "string" ? e.sig : null;
      if (!signature) return null;
      const slot = toNum(e.slot);
      const blockTime = toNum(e.blockTime);
      return { signature, slot: slot != null ? Math.trunc(slot) : null, blockTime: blockTime != null ? Math.trunc(blockTime) : null };
    })
    .filter((v): v is SignatureRow => Boolean(v));

  const detailSigs = signatures.slice(0, txDetailLimit);
  const feePayersBySignature: Record<string, string | null> = {};
  const buyersBySignature: Record<string, string[]> = {};
  const buyLikeBuyersBySignature: Record<string, string[]> = {};
  const transferLikeBuyersBySignature: Record<string, string[]> = {};
  const sellersBySignature: Record<string, string[]> = {};
  const freshBuyersBySignature: Record<string, string[]> = {};
  const freshBuyLikeBuyersBySignature: Record<string, string[]> = {};
  const jitoTipBySignature: Record<string, boolean> = {};

  const jitoTipAccounts = (process.env.SOLANA_JITO_TIP_ACCOUNTS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  await pMap(
    detailSigs,
    async (sig) => {
      const txPayload = await timeVendor("helius_get_transaction", () =>
        defaultHeliusClient.invokeRaw("helius_get_transaction", { signature: sig.signature }),
      ).catch(() => null);
      if (!txPayload) {
        feePayersBySignature[sig.signature] = null;
        buyersBySignature[sig.signature] = [];
        buyLikeBuyersBySignature[sig.signature] = [];
        transferLikeBuyersBySignature[sig.signature] = [];
        sellersBySignature[sig.signature] = [];
        freshBuyersBySignature[sig.signature] = [];
        freshBuyLikeBuyersBySignature[sig.signature] = [];
        jitoTipBySignature[sig.signature] = false;
        return;
      }
      const txResult = unwrapToolResult(txPayload);
      feePayersBySignature[sig.signature] = normalizeFeePayerFromGetTransaction(txResult);
      const classified = classifyMintTxFromGetTransaction({ tx: txResult, mint, jitoTipAccounts });
      buyersBySignature[sig.signature] = Array.from(classified.buyers);
      buyLikeBuyersBySignature[sig.signature] = Array.from(classified.buyLikeBuyers);
      transferLikeBuyersBySignature[sig.signature] = Array.from(classified.transferLikeBuyers);
      sellersBySignature[sig.signature] = Array.from(classified.sellers);
      freshBuyersBySignature[sig.signature] = Array.from(classified.freshBuyers);
      freshBuyLikeBuyersBySignature[sig.signature] = Array.from(
        [...classified.freshBuyers].filter((w) => classified.buyLikeBuyers.has(w)),
      );
      jitoTipBySignature[sig.signature] = classified.jitoTipDetected;
    },
    { concurrency },
  );

  return summarizeMintActivity({
    signatures,
    feePayersBySignature,
    buyersBySignature,
    buyLikeBuyersBySignature,
    transferLikeBuyersBySignature,
    sellersBySignature,
    freshBuyersBySignature,
    freshBuyLikeBuyersBySignature,
    jitoTipBySignature,
    createdAtUnix: params.createdAtUnix ?? null,
  });
}
