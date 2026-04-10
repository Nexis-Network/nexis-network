"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";

/**
 * User-friendly error descriptions for common auth page errors.
 * Raw error messages are logged server-side but never shown to users.
 */
function getUserFriendlyMessage(error: Error): string {
  const msg = (error.message ?? "").toLowerCase();

  if (msg.includes("network") || msg.includes("fetch")) {
    return "We could not connect to the authentication service. Please check your internet connection and try again.";
  }
  if (msg.includes("timeout")) {
    return "The request timed out. Please try again in a moment.";
  }
  if (msg.includes("session") || msg.includes("expired")) {
    return "Your session has expired. Please sign in again.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (msg.includes("unauthorized") || msg.includes("401")) {
    return "Your session is no longer valid. Please sign in again.";
  }

  return "Something went wrong while loading the authentication page. Please try again.";
}

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the full error server-side for debugging; never expose raw details to users
    logger.error("[AuthPage ERROR]", error);
  }, [error]);

  const friendlyMessage = getUserFriendlyMessage(error);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-4 px-4">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-2xl font-regular">Authentication Error</h2>
        <p className="text-muted-foreground">{friendlyMessage}</p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">
            Reference: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
          >
            Go Home
          </Button>
        </div>
      </div>
    </main>
  );
}

