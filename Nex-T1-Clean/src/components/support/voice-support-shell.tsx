"use client";

import { VoiceSupportAgentCard } from "@/components/support/voice-support-agent-card";
import type { ElevenLabsSupportConfig } from "@/server/services/elevenlabs-config";

type VoiceSupportShellProps = {
  config: ElevenLabsSupportConfig;
  className?: string;
};

export function VoiceSupportShell({ config, className }: VoiceSupportShellProps) {
  const missingKeys = [];
  if (!config.hasAgentId) {
    missingKeys.push("ELEVENLABS_AGENT_ID (or NEXT_PUBLIC_ELEVENLABS_AGENT_ID)");
  }
  if (!config.hasApiKey) {
    missingKeys.push("ELEVENLABS_API_KEY");
  }

  if (!config.enabled) {
    return (
      <div className={className}>
        <div className="text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-semibold">Support Assistant</h2>
          <p className="mt-2">
            Voice support is not configured for this environment. Please set{" "}
            <span className="font-medium">{missingKeys.join(" and ")}</span> to enable the live assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <VoiceSupportAgentCard agentId={config.agentId} />
    </div>
  );
}
