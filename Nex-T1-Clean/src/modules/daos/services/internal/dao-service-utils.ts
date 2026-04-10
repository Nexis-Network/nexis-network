import { logger } from "@/lib/logger";
import {
  type DaoCapabilities,
  type DaoCapabilityPatch,
  type DaoMembership,
} from "@/modules/daos/contracts";
import type { OrgMemberRole } from "@/server/api/helpers/with-agent-auth";
import type { SupabaseServiceRoleClient } from "@/server/services/supabase/service-role";

export const DAO_ADMIN_ROLES = new Set(["owner", "admin", "council"]);
export const DAO_PROPOSAL_ROLES = new Set([
  "owner",
  "admin",
  "council",
  "proposer",
]);
export const DAO_VOTE_ROLES = new Set([
  "owner",
  "admin",
  "council",
  "proposer",
  "member",
]);

export type JsonRecord = Record<string, UntypedJson>;

export type AccessResult = {
  service: SupabaseServiceRoleClient;
  userId: string;
  orgId: string;
  membershipRole: OrgMemberRole;
};

export class DaoServiceError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: UntypedJson;

  constructor(
    message: string,
    options?: { status?: number; code?: string; details?: UntypedJson },
  ) {
    super(message);
    this.name = "DaoServiceError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "DAO_ERROR";
    this.details = options?.details;
  }
}

export function parseRow<T>(
  schema: { parse: (value: unknown) => T },
  value: unknown,
  label: string,
): T {
  try {
    return schema.parse(value);
  } catch (error) {
    logger.error("dao_row_parse_failed", {
      label,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new DaoServiceError(`Failed to parse ${label}`, {
      status: 500,
      code: "DAO_PARSE_ERROR",
    });
  }
}

export function parseOptionalRow<T>(
  schema: { parse: (value: unknown) => T },
  value: unknown,
  label: string,
): T | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return schema.parse(value);
  } catch (error) {
    logger.error("dao_row_parse_failed", {
      label,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function parseRows<T>(
  schema: { parse: (value: unknown) => T },
  rows: unknown[] | null | undefined,
  label: string,
  options?: { skipInvalid?: boolean },
): T[] {
  const parsed: T[] = [];

  for (const row of rows ?? []) {
    try {
      parsed.push(schema.parse(row));
    } catch (error) {
      logger.error("dao_row_parse_failed", {
        label,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!options?.skipInvalid) {
        throw new DaoServiceError(`Failed to parse ${label}`, {
          status: 500,
          code: "DAO_PARSE_ERROR",
        });
      }
    }
  }

  return parsed;
}

function roleRank(role: string | null | undefined): number {
  switch (role) {
    case "owner":
      return 6;
    case "admin":
      return 5;
    case "council":
      return 4;
    case "proposer":
      return 3;
    case "member":
      return 2;
    case "observer":
      return 1;
    default:
      return 0;
  }
}

export function getHighestDaoRole(memberships: DaoMembership[]): string | null {
  const sorted = [...memberships].sort(
    (left, right) => roleRank(right.role) - roleRank(left.role),
  );
  return sorted[0]?.role ?? null;
}

export function isNonEmptyString(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeAddress(
  address: string,
  chainFamily: "evm" | "solana",
): string {
  const trimmed = address.trim();
  return chainFamily === "evm" ? trimmed.toLowerCase() : trimmed;
}

export function formatDaoProposalDescription(
  title: string,
  description?: string | null,
): string {
  const trimmedTitle = title.trim();
  const trimmedDescription = description?.trim();
  return trimmedDescription
    ? `# ${trimmedTitle}\n${trimmedDescription}`
    : `# ${trimmedTitle}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function defaultGovernanceModelForChain(
  chainFamily: "evm" | "solana",
): string {
  return chainFamily === "evm"
    ? "openzeppelin-governor"
    : "realms-governance";
}

export function defaultTreasuryModelForChain(
  chainFamily: "evm" | "solana",
): string {
  return chainFamily === "evm" ? "safe-treasury" : "squads-multisig";
}

export function calculateCapabilityScore(
  capabilities: Partial<DaoCapabilities> | null | undefined,
): number {
  if (!capabilities) return 0;

  const flags = [
    capabilities.treasuryManagementEnabled,
    capabilities.proposalCreationEnabled,
    capabilities.votingEnabled,
    capabilities.memberManagementEnabled,
    capabilities.agentAutomationEnabled,
    capabilities.agentVotingEnabled,
    capabilities.importEnabled,
    capabilities.analyticsEnabled,
  ];

  return flags.reduce((total, flag) => total + (flag ? 1 : 0), 0);
}

export function resolveInitialLifecycleState(options: {
  importSource: "app" | "imported";
  chainFamily: "evm" | "solana";
  governanceAddress?: string | null;
  treasuryAddress?: string | null;
  safeAddress?: string | null;
  realmAddress?: string | null;
  squadsAddress?: string | null;
}): "draft" | "active" {
  if (options.importSource === "imported") {
    return "active";
  }

  const hasOnchainReference =
    isNonEmptyString(options.governanceAddress) ||
    isNonEmptyString(options.treasuryAddress) ||
    isNonEmptyString(options.safeAddress) ||
    isNonEmptyString(options.realmAddress) ||
    isNonEmptyString(options.squadsAddress);

  return hasOnchainReference ? "active" : "draft";
}

export function buildCapabilitiesInsert(options: {
  daoId: string;
  orgId: string;
  ownershipMode: "user" | "agent" | "hybrid";
  patch?: DaoCapabilityPatch;
}): JsonRecord {
  const patch = options.patch ?? {};

  return {
    dao_id: options.daoId,
    org_id: options.orgId,
    treasury_management_enabled: patch.treasuryManagementEnabled ?? true,
    proposal_creation_enabled: patch.proposalCreationEnabled ?? true,
    voting_enabled: patch.votingEnabled ?? true,
    member_management_enabled: patch.memberManagementEnabled ?? true,
    agent_automation_enabled:
      patch.agentAutomationEnabled ?? options.ownershipMode !== "user",
    agent_voting_enabled:
      patch.agentVotingEnabled ?? options.ownershipMode === "agent",
    import_enabled: patch.importEnabled ?? true,
    analytics_enabled: patch.analyticsEnabled ?? true,
    metadata: patch.metadata ?? {},
  };
}

export function isDaoServiceError(error: unknown): error is DaoServiceError {
  return error instanceof DaoServiceError;
}

export function toDaoErrorResponse(error: unknown): {
  status: number;
  code: string;
  message: string;
  details?: UntypedJson;
} {
  if (isDaoServiceError(error)) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  return {
    status: 500,
    code: "DAO_INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unexpected DAO error",
  };
}
