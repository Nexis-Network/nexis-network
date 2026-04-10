"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const hasReportedRef = useRef(false);

  useEffect(() => {
    logger.error("Marketing page error:", error);
    if (hasReportedRef.current) return;
    hasReportedRef.current = true;
    Sentry.captureException(error, {
      tags: { "app.error_boundary": "marketing" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-regular text-foreground">Something went wrong</h2>
      <p className="max-w-lg text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={() => reset()} variant="outline" className="inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
