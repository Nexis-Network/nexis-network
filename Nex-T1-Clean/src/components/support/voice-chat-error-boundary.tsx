"use client";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Card } from "@/components/ui/card";

function VoiceChatErrorFallback() {
  return (
    <Card className="flex h-[400px] w-full max-w-3xl flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-32 w-32 rounded-full bg-muted/20" />
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-foreground">
            Voice assistant unavailable
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Something went wrong loading the voice assistant. Please refresh the
            page or try again later.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function VoiceChatErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary fallback={<VoiceChatErrorFallback />}>
      {children}
    </ErrorBoundary>
  );
}
