import type { WalletNftPosition } from "@/modules/wallets/profile";

type UnknownRecord = Record<string, UntypedJson>;

const URI_CANDIDATE_KEYS = [
  "uri",
  "url",
  "href",
  "link",
  "resource",
  "gateway",
  "cdnUri",
  "cdnUrl",
  "cdn",
  "src",
] as const;

export function summarizeSolanaNfts(
  walletAddress: string,
  nfts: Array<Record<string, UntypedJson>>,
): WalletNftPosition[] {
  return nfts
    .slice(0, 40)
    .map((nft, index) => {
      const content = isRecord(nft?.content) ? (nft.content as UnknownRecord) : null;
      const metadata: UnknownRecord = content && isRecord((content as UnknownRecord).metadata)
        ? ((content as UnknownRecord).metadata as UnknownRecord)
        : {};
      const id = coerceString(nft?.id ?? nft?.mint ?? nft?.address) ?? `${index}`;
      const name = coerceString(nft?.name ?? metadata?.["name"]);
      const description = coerceString(nft?.description ?? metadata?.["description"]);
      const image =
        extractFirstContentFileUri(content?.["files"]) ??
        coerceString(metadata?.["image"]) ??
        coerceString(nft?.image);
      const collection = coerceString(nft?.collection ?? metadata?.["collection"]);

      return {
        id: `${walletAddress}:solana-nft:${id}`,
        name,
        description,
        image,
        collection,
        chainId: null,
        priceUsd: null,
      } satisfies WalletNftPosition;
    });
}

export function extractFirstContentFileUri(value: UntypedJson): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const entry of value) {
    if (typeof entry === "string") {
      const candidate = coerceString(entry);
      if (candidate) {
        return candidate;
      }
      continue;
    }

    if (!isRecord(entry)) {
      continue;
    }

    const direct = readUriFromRecord(entry as UnknownRecord);
    if (direct) {
      return direct;
    }

    const cdnCandidate = isRecord((entry as UnknownRecord).cdn)
      ? readUriFromRecord((entry as UnknownRecord).cdn as UnknownRecord)
      : null;
    if (cdnCandidate) {
      return cdnCandidate;
    }

    const nestedMetadata = isRecord((entry as UnknownRecord).metadata)
      ? readUriFromRecord((entry as UnknownRecord).metadata as UnknownRecord)
      : null;
    if (nestedMetadata) {
      return nestedMetadata;
    }
  }

  return null;
}

export function coerceString(value: UntypedJson): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function isRecord(value: UntypedJson): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readUriFromRecord(record: UnknownRecord): string | null {
  for (const key of URI_CANDIDATE_KEYS) {
    const candidate = coerceString(record?.[key]);
    if (candidate) {
      return candidate;
    }
  }
  return null;
}
