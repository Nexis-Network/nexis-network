"use client";

import { useSearchParams } from "next/navigation";

import ApiKeysContent from "@/components/settings/developer/api-keys-content";
import ApiProductsContent from "@/components/settings/developer/api-products-content";
import ApiRequestLogsContent from "@/components/settings/developer/api-request-logs-content";
import ApiUsageContent from "@/components/settings/developer/api-usage-content";
import CacheContent from "@/components/settings/developer/cache-content";

export function SettingsDeveloperSection() {
  const searchParams = useSearchParams();
  const activeView =
    searchParams.get("view") ??
    searchParams.get("tab") ??
    "api-keys";

  if (activeView === "api-products") {
    return <ApiProductsContent />;
  }

  if (activeView === "api-usage") {
    return <ApiUsageContent />;
  }

  if (activeView === "api-logs") {
    return <ApiRequestLogsContent />;
  }

  if (activeView === "cache") {
    return <CacheContent />;
  }

  return <ApiKeysContent />;
}
