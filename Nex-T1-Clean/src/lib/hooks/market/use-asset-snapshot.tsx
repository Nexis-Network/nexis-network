"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchAssetSnapshot } from "@/modules/prices/token-page/api";
import type { AssetSnapshotResponse } from "@/types/token-page";

type UseAssetSnapshotOptions = {
  assetType: "token" | "nft";
  slug: string;
  enabled?: boolean;
  initialData?: AssetSnapshotResponse | null;
};

export function useAssetSnapshot({ assetType, slug, enabled = true, initialData }: UseAssetSnapshotOptions) {
  return useQuery<AssetSnapshotResponse>({
    queryKey: ["asset-snapshot", assetType, slug],
    queryFn: () => fetchAssetSnapshot(assetType, slug),
    enabled: Boolean(slug) && enabled,
    initialData: initialData ?? undefined,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
