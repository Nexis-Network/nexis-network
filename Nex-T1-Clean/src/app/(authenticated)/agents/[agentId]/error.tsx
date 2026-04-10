"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";


import { logger } from '@/lib/logger';
export default function AgentDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("Agent detail error", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h2 className="text-2xl font-regular text-foreground">We couldn’t load this agent.</h2>
      <p className="max-w-lg text-sm text-muted-foreground">
        {error.message || "Try refreshing the page or return to the marketplace."}
      </p>
      <Button onClick={() => reset()} variant="outline" className="inline-flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
