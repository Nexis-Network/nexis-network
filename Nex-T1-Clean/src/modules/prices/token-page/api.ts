import type { AssetSnapshotResponse, CompareAssetSearchResponse } from "@/types/token-page";

type QueryValue = string | number | boolean | undefined | null;

const BASE_PATH = "/api/analytics/assets";

async function apiGet<T>(path: string, params?: Record<string, QueryValue | QueryValue[]>): Promise<T> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry === undefined || entry === null) return;
          searchParams.append(key, String(entry));
        });
      } else {
        searchParams.set(key, String(value));
      }
    }
  }

  const query = searchParams.toString();
  const response = await fetch(`${path}${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = typeof errorBody?.error === "string" ? errorBody.error : `Request failed with status ${response.status}`;
    const error = new Error(message);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export function fetchAssetSnapshot(assetType: "token" | "nft", slug: string): Promise<AssetSnapshotResponse> {
  const targetType = assetType === "nft" ? "nft" : "token";
  return apiGet<AssetSnapshotResponse>(`${BASE_PATH}/${encodeURIComponent(targetType)}/${encodeURIComponent(slug)}`);
}

export function fetchAssetComparisonSearch(query: string, params?: { limit?: number }): Promise<CompareAssetSearchResponse> {
  const trimmed = query.trim();
  return apiGet<CompareAssetSearchResponse>(`${BASE_PATH}/search`, {
    q: trimmed,
    limit: params?.limit,
  });
}
