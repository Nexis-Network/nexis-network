import { Suspense } from "react";

import { notFound } from "next/navigation";

import { TokenAssetPage } from "@/components/token-page/token-asset-page";
import { getAssetSnapshot } from "@/server/market/token-asset";
import type { AssetSnapshotResponse } from "@/types/token-page";

type PageParams = {
  assetType: string;
  slug: string;
};

type AssetPageProps = {
  params: Promise<PageParams>;
};


export default async function AssetAnalyticsPage({ params }: AssetPageProps) {
  const { assetType, slug } = await params;
  if (!slug) {
    notFound();
  }

  const normalizedType = assetType?.toLowerCase() === "nft" ? "nft" : "token";
  const snapshot = await getAssetSnapshot(normalizedType, slug);

  const initialSnapshot: AssetSnapshotResponse | null = snapshot ?? null;

  return (
    <div className="font-sans">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading asset analytics…</div>}>
        <TokenAssetPage assetType={normalizedType} slug={slug} initialSnapshot={initialSnapshot} />
      </Suspense>
    </div>
  );
}
