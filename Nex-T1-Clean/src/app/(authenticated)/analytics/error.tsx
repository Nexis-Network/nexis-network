"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const hasReportedRef = useRef(false);

  useEffect(() => {
    logger.error("Analytics error:", error);
    if (hasReportedRef.current) return;
    hasReportedRef.current = true;
    Sentry.captureException(error, {
      tags: { "app.error_boundary": "analytics" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h2 className="text-2xl font-regular text-foreground">Failed to load analytics</h2>
      <p className="max-w-lg text-sm text-muted-foreground">
        {error.message || "Please try again or refresh the page."}
      </p>
      <Button onClick={() => reset()} variant="outline" className="inline-flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
