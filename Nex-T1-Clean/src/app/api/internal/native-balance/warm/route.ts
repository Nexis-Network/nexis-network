import { apiResponse } from "@/lib/api-platform";
import {
  buildNativeBalanceCacheKey,
  normalizeAddressForLookup,
  refreshNativeBalance,
  type NativeBalanceChainKind,
} from "@/server/wallets/native-balance-cache";

const CRON_SECRET = (process.env.NEX_NATIVE_BALANCE_CRON_SECRET ?? "").trim();
const WARM_ENV = process.env.NEX_NATIVE_BALANCE_WARM_ENTRIES ?? "";

function parseWarmEntry(raw: string) {
  const [kindRaw, maybeChainId, maybeAddress] = raw.split(":").map((part) => part.trim());
  if (!kindRaw) {
    return null;
  }
  const kind = kindRaw as NativeBalanceChainKind;
  if (kind !== "evm" && kind !== "solana") {
    return null;
  }
  if (kind === "solana") {
    const address = (maybeChainId ?? "").trim();
    if (!address) return null;
    return {
      kind,
      address,
    } as const;
  }
  const chainId = Number(maybeChainId ?? "");
  const address = (maybeAddress ?? "").trim();
  if (!Number.isFinite(chainId) || !address) {
    return null;
  }
  return {
    kind,
    chainId,
    address,
  } as const;
}

export async function POST(request: Request) {
  if (!CRON_SECRET) {
    return apiResponse.error("NOT_IMPLEMENTED", "cron_secret_missing", 501);
  }
  const providedSecret =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret") ?? "";
  if (providedSecret.trim() !== CRON_SECRET) {
    return apiResponse.unauthorized("unauthorized");
  }

  const warmSpecs = WARM_ENV.split(/[,\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!warmSpecs.length) {
    return apiResponse.success({ warmed: [], message: "no_entries" });
  }

  const entries = warmSpecs
    .map(parseWarmEntry)
    .filter((entry): entry is NonNullable<ReturnType<typeof parseWarmEntry>> => Boolean(entry));

  const results = await Promise.allSettled(
    entries.map(async (entry) => {
      const normalizedAddress = normalizeAddressForLookup(entry.kind, entry.address);
      const value = await refreshNativeBalance({
        chainKind: entry.kind,
        address: normalizedAddress,
        chainId: "chainId" in entry ? entry.chainId : undefined,
      });
      return {
        key: buildNativeBalanceCacheKey({
          chainKind: entry.kind,
          address: normalizedAddress,
          chainId: "chainId" in entry ? entry.chainId : undefined,
        }),
        value,
      } as const;
    }),
  );

  const warmed = results.map((result, index) => {
    const source = entries[index];
    if (result.status === "fulfilled") {
      return {
        status: "ok" as const,
        kind: source.kind,
        chainId: "chainId" in source ? source.chainId : null,
        address: normalizeAddressForLookup(source.kind, source.address),
        value: result.value.value,
        key: result.value.key,
      };
    }
    return {
      status: "error" as const,
      kind: source.kind,
      chainId: "chainId" in source ? source.chainId : null,
      address: normalizeAddressForLookup(source.kind, source.address),
      error: result.reason instanceof Error ? result.reason.message : String(result.reason ?? "unknown"),
    };
  });

  return apiResponse.success({ warmed });
}
