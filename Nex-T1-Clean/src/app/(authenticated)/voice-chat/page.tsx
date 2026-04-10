import { Suspense } from "react";

import { getElevenLabsSupportConfig } from "@/server/services/elevenlabs-config";
import { VoiceSupportShell } from "@/components/support/voice-support-shell";
import { VoiceChatErrorBoundary } from "@/components/support/voice-chat-error-boundary";

function VoiceChatFallback() {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-32 w-32 animate-pulse rounded-full bg-muted/20" />
        <p className="text-sm text-muted-foreground">Loading voice assistant...</p>
      </div>
    </div>
  );
}

export default function Page() {
  const config = getElevenLabsSupportConfig();

  return (
    <div className="mx-auto flex w-full justify-center">
      <VoiceChatErrorBoundary>
        <Suspense fallback={<VoiceChatFallback />}>
          <VoiceSupportShell config={config} className="w-full max-w-3xl" />
        </Suspense>
      </VoiceChatErrorBoundary>
    </div>
  );
}
