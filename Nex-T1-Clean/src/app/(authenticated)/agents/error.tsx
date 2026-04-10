"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
export default function AgentsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("Agent marketplace error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h2 className="text-2xl font-regular text-foreground">Something went wrong loading the marketplace.</h2>
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
