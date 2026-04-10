"use client";

import SmoothAgentAvatar from "@/components/smoothui/agent-avatar";
import { resolveAgentAvatarIdentity, type AgentAvatarIdentityInput } from "@/lib/agents/agent-avatar";
import { cn } from "@/lib/utils";

type NexAgentAvatarProps = AgentAvatarIdentityInput & {
  className?: string;
  size?: number;
  animated?: boolean;
};

export function NexAgentAvatar({
  agentId,
  agentName,
  model,
  conversationId,
  fallbackLabel,
  className,
  size = 32,
  animated = true,
}: NexAgentAvatarProps) {
  const identity = resolveAgentAvatarIdentity({
    agentId,
    agentName,
    model,
    conversationId,
    fallbackLabel,
  });

  return (
    <SmoothAgentAvatar
      seed={identity.seed}
      size={size}
      animated={animated}
      aria-label={`${identity.label} avatar`}
      className={cn(
        "shrink-0 rounded-full ring-1 ring-white/10 shadow-[0_0_18px_rgba(94,234,212,0.14)]",
        className,
      )}
    />
  );
}
