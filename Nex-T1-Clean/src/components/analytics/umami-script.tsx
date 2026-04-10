"use client";

import Script from "next/script";

export function UmamiScript() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://analytics.nex-t1.ai/script.js";

  if (!websiteId) return null;

  return (
    <Script
      defer
      src={scriptUrl}
      data-website-id={websiteId}
      strategy="lazyOnload"
    />
  );
}
