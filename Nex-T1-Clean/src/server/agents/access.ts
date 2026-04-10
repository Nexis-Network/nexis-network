import type { OrgMemberRole } from "@/server/api/helpers/with-agent-auth";

export type AgentVisibility = "public" | "private" | "unlisted";

export function canManageAgent(membershipRole: OrgMemberRole): boolean {
  return membershipRole === "owner" || membershipRole === "admin" || membershipRole === "manager";
}

export function canViewPrivateAgentConfig(options: {
  userId: string;
  membershipRole: OrgMemberRole;
  agentOwnerUserId: string | null;
}): boolean {
  if (options.agentOwnerUserId && options.agentOwnerUserId === options.userId) return true;
  return options.membershipRole === "owner" || options.membershipRole === "admin";
}

export function shouldRedactAgentConfig(options: {
  agentVisibility: AgentVisibility;
  canViewPrivateConfig: boolean;
}): boolean {
  if (options.agentVisibility === "private") {
    return !options.canViewPrivateConfig;
  }
  return false;
}

