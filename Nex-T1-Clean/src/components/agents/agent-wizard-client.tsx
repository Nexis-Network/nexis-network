"use client";

import { useRouter } from "next/navigation";

import { AgentWizard } from "@/components/agents/agent-wizard";

export function AgentWizardClient() {
  const router = useRouter();
  return (
    <AgentWizard
      onCompleted={(agentId) => {
        router.push(`/agents/${agentId}`);
      }}
    />
  );
}
