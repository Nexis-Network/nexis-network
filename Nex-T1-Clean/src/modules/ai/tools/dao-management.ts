import type { JSONSchema7 } from "json-schema";

import { createApprovalRequest } from "@/lib/approvals/state-machine";
import { logger } from "@/lib/logger";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { requireAal2FromClaims } from "@/server/security/mfa-assurance";
import {
  getDaoOverview,
  listDaoDirectory,
} from "@/modules/daos/services/directory-service";
import {
  createDao,
  importDao,
  updateDaoCapabilities,
} from "@/modules/daos/services/lifecycle-service";
import { upsertDaoMembership } from "@/modules/daos/services/membership-service";
import {
  castDaoVote,
  createDaoProposal,
  updateDaoProposalStatus,
} from "@/modules/daos/services/proposal-service";
import { syncDao } from "@/modules/daos/services/sync-service";
import {
  createDaoTreasuryAction,
  executeDaoTreasuryAction,
  updateDaoTreasuryAction,
} from "@/modules/daos/services/treasury-service";
import {
  booleanProp,
  createTool,
  createToolSchema,
  enumProp,
  objectProp,
  stringProp,
  arrayProp,
  type ToolExecutionContext,
} from "./create-tool";
import {
  daoChainFamilyLiterals,
  daoLifecycleStateLiterals,
  daoImportSourceLiterals,
  daoMembershipRoleLiterals,
  daoMembershipTypeLiterals,
  daoOwnershipModeLiterals,
  daoProposalStatusLiterals,
  daoTreasuryActionStatusLiterals,
  daoVoteChoiceLiterals,
  type CreateDaoInput,
  type DaoCapabilityPatch,
  type DaoDirectoryFilters,
  type DaoMembershipInput,
  type DaoOverview,
  type DaoProposalInput,
  type DaoSyncJob,
  type DaoTreasuryActionInput,
  type DaoVoteInput,
  type ImportDaoInput,
} from "@/modules/daos/contracts";
import type { AgentDaosArtifactData } from "@/modules/ai/artifacts/agent-daos";
import type { DaoProposalsArtifactData } from "@/modules/ai/artifacts/dao-proposals";
import type { DaoTreasuryArtifactData } from "@/modules/ai/artifacts/dao-treasury";
import type { DaoWorkspaceArtifactData } from "@/modules/ai/artifacts/dao-workspace";

type DaoArtifactType =
  | "agent-daos"
  | "dao-workspace"
  | "dao-proposals"
  | "dao-treasury";

type DaoToolResult<TPayload> = {
  status: "ok" | "awaiting_approval";
  summary: string;
  artifactType: DaoArtifactType;
  identifier: string;
  title: string;
  payload: TPayload;
  artifact: {
    type: DaoArtifactType;
    identifier: string;
    title: string;
    payload: TPayload;
  };
  parts: Array<{
    type: string;
    data: {
      id: string;
      type: DaoArtifactType;
      title: string;
      status: "complete";
      version: number;
      createdAt: number;
      updatedAt: number;
      payload: TPayload;
    };
  }>;
  approvalRequestId?: string;
};

type DaoCreateToolInput = {
  orgId?: string;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  ownershipMode?: "user" | "agent" | "hybrid";
  primaryChainFamily: "evm" | "solana";
  chainRef: string;
  governanceModel?: string;
  treasuryModel?: string;
  linkedAgentId?: string | null;
  tags?: string[];
  capabilities?: DaoCapabilityPatch;
  binding?: CreateDaoInput["binding"];
  metadata?: Record<string, UntypedJson>;
};

type DaoImportToolInput = {
  orgId?: string;
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  ownershipMode?: "user" | "agent" | "hybrid";
  chainFamily: "evm" | "solana";
  chainRef: string;
  governanceAddress?: string | null;
  treasuryAddress?: string | null;
  safeAddress?: string | null;
  timelockAddress?: string | null;
  tokenAddress?: string | null;
  realmAddress?: string | null;
  squadsAddress?: string | null;
  proofAddress: string;
  linkedAgentId?: string | null;
  tags?: string[];
  capabilities?: DaoCapabilityPatch;
  metadata?: Record<string, UntypedJson>;
};

type DaoOverviewInput = {
  orgId?: string;
  daoId: string;
  focusTab?:
    | "overview"
    | "proposals"
    | "treasury"
    | "members"
    | "capabilities"
    | "activity"
    | "settings";
};

type DaoProposalsInput = {
  orgId?: string;
  daoId: string;
};

type DaoDirectorySearchInput = {
  orgId?: string;
  query?: string;
  category?: string;
  chainFamily?: "evm" | "solana";
  ownershipMode?: "user" | "agent" | "hybrid";
  importSource?: "app" | "imported";
  lifecycleState?: "draft" | "active" | "archived" | "detached";
  mineOnly?: boolean;
};

type DaoDraftProposalToolInput = {
  orgId?: string;
  daoId: string;
  title: string;
  slug?: string;
  description?: string;
  chainBindingId?: string | null;
  externalProposalId?: string;
  proposerAgentId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  quorum?: string;
  threshold?: string;
  actions?: UntypedJson[];
  metadata?: Record<string, UntypedJson>;
};

type DaoSubmitProposalToolInput = DaoDraftProposalToolInput & {
  status?: "active" | "queued" | "succeeded";
};

type DaoVoteToolInput = {
  orgId?: string;
  daoId: string;
  proposalId: string;
  choice: "for" | "against" | "abstain" | "veto";
  voterAddress: string;
  voterAgentId?: string | null;
  weight?: string;
  reason?: string;
  txHash?: string;
  metadata?: Record<string, UntypedJson>;
};

type DaoCreateTreasuryActionToolInput = {
  orgId?: string;
  daoId: string;
  chainBindingId?: string | null;
  proposalId?: string | null;
  requestedByAgentId?: string | null;
  title: string;
  actionType: string;
  targetAddress?: string | null;
  valueBaseUnits?: string;
  payload: Record<string, UntypedJson>;
  status?: "draft" | "pending_approval" | "approved" | "submitted";
  approvalRequestId?: string | null;
  metadata?: Record<string, UntypedJson>;
};

type DaoExecuteTreasuryActionToolInput = {
  orgId?: string;
  daoId: string;
  actionId: string;
  status?:
    | "pending_approval"
    | "approved"
    | "submitted"
    | "executed"
    | "failed"
    | "cancelled";
  txHash?: string;
  lastError?: string;
};

type DaoManageMembersToolInput = {
  orgId?: string;
  daoId: string;
  userId?: string | null;
  agentId?: string | null;
  membershipType?: "user" | "agent" | "external";
  role: "owner" | "admin" | "council" | "proposer" | "member" | "observer";
  walletAddress?: string | null;
  votingPower?: string;
  source?: string;
  isActive?: boolean;
  metadata?: Record<string, UntypedJson>;
};

type DaoUpdateCapabilitiesToolInput = {
  orgId?: string;
  daoId: string;
  capabilities: DaoCapabilityPatch;
};

type DaoSyncToolInput = {
  orgId?: string;
  daoId: string;
  jobType?: string;
};

const STRING_ARRAY_ITEM_SCHEMA: JSONSchema7 = { type: "string" };

const jsonObjectProp = (description: string): JSONSchema7 => ({
  type: "object",
  description,
  additionalProperties: true,
});

const daoCapabilitiesProp = objectProp("DAO capability flags.", {
  treasuryManagementEnabled: booleanProp("Enable treasury management."),
  proposalCreationEnabled: booleanProp("Enable proposal authoring."),
  votingEnabled: booleanProp("Enable DAO voting."),
  memberManagementEnabled: booleanProp("Enable member and council management."),
  agentAutomationEnabled: booleanProp("Enable agent treasury automation."),
  agentVotingEnabled: booleanProp("Enable agent-based voting."),
  importEnabled: booleanProp("Enable import and attach flows."),
  analyticsEnabled: booleanProp("Enable analytics and indexing."),
  metadata: jsonObjectProp("Optional capability metadata."),
});

const daoBindingProp = objectProp("Optional on-chain DAO binding references.", {
  governanceAddress: stringProp("Governor or governance program address."),
  treasuryAddress: stringProp("Treasury account address."),
  safeAddress: stringProp("Safe address for EVM treasury."),
  timelockAddress: stringProp("Timelock controller address."),
  tokenAddress: stringProp("Governance token address."),
  realmAddress: stringProp("Realms address for Solana governance."),
  squadsAddress: stringProp("Squads multisig address for Solana treasury."),
  externalDaoId: stringProp("External DAO identifier."),
  externalUrl: stringProp("External DAO dashboard URL."),
  metadata: jsonObjectProp("Optional binding metadata."),
});

function normalizeStringArray(values: string[] | null | undefined): string[] | undefined {
  const normalized = (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

async function resolveDaoToolAuth(
  context: ToolExecutionContext | undefined,
  options?: { requireAal2?: boolean },
): Promise<{ userId: string; orgId: string | null }> {
  if (!context?.userId) {
    throw new Error("Authenticated user required for DAO tools.");
  }

  let authOrgId: string | null = null;
  let claims: Record<string, UntypedJson> | null = null;

  try {
    const { context: authContext } = await resolveSupabaseContext(undefined, {
      refreshSession: false,
    });
    authOrgId = authContext?.orgId ?? null;
    claims = authContext?.claims ?? null;

    if (authContext?.userId && authContext.userId !== context.userId) {
      logger.warn("dao_tool_user_context_mismatch", {
        toolUserId: context.userId,
        authUserId: authContext.userId,
      });
    }
  } catch (error) {
    logger.warn("dao_tool_auth_context_unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (options?.requireAal2) {
    const assurance = requireAal2FromClaims(claims);
    if (!assurance.ok) {
      throw new Error(
        "Multi-factor authentication (AAL2) is required for this DAO action.",
      );
    }
  }

  return {
    userId: context.userId,
    orgId: authOrgId,
  };
}

function buildArtifactResult<TPayload>(options: {
  artifactType: DaoArtifactType;
  identifier: string;
  title: string;
  summary: string;
  payload: TPayload;
  status?: "ok" | "awaiting_approval";
  approvalRequestId?: string;
}): DaoToolResult<TPayload> {
  const now = Date.now();
  const artifactEnvelope = {
    id: options.identifier,
    type: options.artifactType,
    title: options.title,
    status: "complete" as const,
    version: 1,
    createdAt: now,
    updatedAt: now,
    payload: options.payload,
  };

  return {
    status: options.status ?? "ok",
    summary: options.summary,
    artifactType: options.artifactType,
    identifier: options.identifier,
    title: options.title,
    payload: options.payload,
    artifact: {
      type: options.artifactType,
      identifier: options.identifier,
      title: options.title,
      payload: options.payload,
    },
    parts: [
      {
        type: `data-artifact-${options.artifactType}`,
        data: artifactEnvelope,
      },
    ],
    ...(options.approvalRequestId
      ? { approvalRequestId: options.approvalRequestId }
      : {}),
  };
}

function buildWorkspaceArtifactData(
  overview: DaoOverview,
  summary: string,
  focusTab?: DaoWorkspaceArtifactData["focusTab"],
): DaoWorkspaceArtifactData {
  return {
    title: `DAO Workspace • ${overview.dao.name}`,
    overview,
    summary,
    focusTab,
    streamState: { completed: true },
    metadata: {
      title: overview.dao.name,
      summary,
      context: {
        daoId: overview.dao.id,
        ownershipMode: overview.dao.ownershipMode,
        chainFamily: overview.dao.primaryChainFamily,
      },
    },
  };
}

function buildProposalsArtifactData(
  overview: DaoOverview,
  summary: string,
): DaoProposalsArtifactData {
  return {
    title: `DAO Proposals • ${overview.dao.name}`,
    daoId: overview.dao.id,
    daoName: overview.dao.name,
    chainFamily: overview.dao.primaryChainFamily,
    proposals: overview.proposals,
    votes: overview.votes,
    summary,
    streamState: { completed: true },
    metadata: {
      title: overview.dao.name,
      summary,
      context: {
        daoId: overview.dao.id,
        proposalCount: overview.proposals.length,
      },
    },
  };
}

function buildTreasuryArtifactData(
  overview: DaoOverview,
  summary: string,
): DaoTreasuryArtifactData {
  return {
    title: `DAO Treasury • ${overview.dao.name}`,
    daoId: overview.dao.id,
    daoName: overview.dao.name,
    chainFamily: overview.dao.primaryChainFamily,
    treasuries: overview.treasuries,
    actions: overview.treasuryActions,
    summary,
    streamState: { completed: true },
    metadata: {
      title: overview.dao.name,
      summary,
      context: {
        daoId: overview.dao.id,
        treasuryCount: overview.treasuries.length,
        actionCount: overview.treasuryActions.length,
      },
    },
  };
}

function buildAgentDaosArtifactData(
  items: Awaited<ReturnType<typeof listDaoDirectory>>,
): AgentDaosArtifactData {
  return {
    title: "Agent Managed DAOs",
    summary:
      items.length === 0
        ? "No DAO organizations matched the current search."
        : `Loaded ${items.length} DAO organizations across EVM and Solana.`,
    daos: items.map((item) => ({
      name: item.name,
      chain: item.primaryChainFamily.toUpperCase(),
      role: item.isMine ? "Manager" : "Viewer",
      treasuryValue: item.treasuryValueUsd ?? 0,
      proposalCount: item.activeProposalCount,
      contractAddress: item.chainRefs[0] ?? item.daoId,
      category: item.category ?? undefined,
      ownershipMode: item.ownershipMode,
      lifecycleState: item.lifecycleState,
    })),
    streamState: { completed: true },
  };
}

async function loadOverviewForArtifact(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
}): Promise<DaoOverview> {
  return getDaoOverview({
    userId: options.userId,
    orgId: options.orgId,
    daoId: options.daoId,
  });
}

async function createTreasuryApproval(options: {
  userId: string;
  daoId: string;
  action: DaoCreateTreasuryActionToolInput;
}): Promise<string> {
  const approval = await createApprovalRequest(
    options.userId,
    {
      toolId: "cdp_wallet",
      command: "dao_execute_treasury_action",
      args: {
        daoId: options.daoId,
        title: options.action.title,
        actionType: options.action.actionType,
        targetAddress: options.action.targetAddress ?? null,
        valueBaseUnits: options.action.valueBaseUnits ?? null,
        payload: options.action.payload,
      },
      preview: {
        title: options.action.title,
        description:
          "Treasury execution requires approval before submission or execution.",
        items: [
          { label: "DAO", value: options.daoId },
          { label: "Action", value: options.action.actionType },
          {
            label: "Target",
            value: options.action.targetAddress ?? "Programmatic execution",
          },
          {
            label: "Value",
            value: options.action.valueBaseUnits ?? "0",
          },
        ],
        warnings: [
          "Treasury actions move value or alter DAO-controlled state.",
          "Verify calldata, destination, and chain before approving.",
        ],
      },
      operationType: "deploy",
    },
    300,
  );

  return approval.id;
}

const daoDirectorySearchSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    query: stringProp("Free-text DAO search query."),
    category: stringProp("DAO category filter."),
    chainFamily: enumProp("Chain family filter.", daoChainFamilyLiterals),
    ownershipMode: enumProp(
      "Ownership mode filter.",
      daoOwnershipModeLiterals,
    ),
    importSource: enumProp("Import source filter.", daoImportSourceLiterals),
    lifecycleState: enumProp(
      "Lifecycle state filter.",
      daoLifecycleStateLiterals,
    ),
    mineOnly: booleanProp("Limit to DAOs the current user manages.", false),
  },
  [],
  { additionalProperties: false },
);

const daoOverviewSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    daoId: stringProp("DAO organization ID."),
    focusTab: enumProp("Preferred workspace tab.", [
      "overview",
      "proposals",
      "treasury",
      "members",
      "capabilities",
      "activity",
      "settings",
    ]),
  },
  ["daoId"],
  { additionalProperties: false },
);

const daoCreateSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    name: stringProp("DAO name.", { minLength: 2, maxLength: 120 }),
    slug: stringProp("Optional DAO slug.", { minLength: 2, maxLength: 120 }),
    description: stringProp("DAO description.", { maxLength: 4000 }),
    category: stringProp("DAO category.", { maxLength: 80 }),
    ownershipMode: enumProp("Ownership mode.", daoOwnershipModeLiterals, "user"),
    primaryChainFamily: enumProp(
      "Primary governance chain family.",
      daoChainFamilyLiterals,
    ),
    chainRef: stringProp("Chain reference, e.g. base-mainnet or solana-mainnet."),
    governanceModel: stringProp("Optional governance model override."),
    treasuryModel: stringProp("Optional treasury model override."),
    linkedAgentId: stringProp("Optional linked agent ID."),
    tags: arrayProp("Optional DAO tags.", STRING_ARRAY_ITEM_SCHEMA, {
      maxItems: 12,
    }),
    capabilities: daoCapabilitiesProp,
    binding: daoBindingProp,
    metadata: jsonObjectProp("Optional metadata."),
  },
  ["name", "primaryChainFamily", "chainRef"],
  { additionalProperties: false },
);

const daoImportSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    name: stringProp("Optional DAO display name.", { minLength: 2, maxLength: 120 }),
    slug: stringProp("Optional DAO slug.", { minLength: 2, maxLength: 120 }),
    description: stringProp("DAO description.", { maxLength: 4000 }),
    category: stringProp("DAO category.", { maxLength: 80 }),
    ownershipMode: enumProp("Ownership mode.", daoOwnershipModeLiterals, "user"),
    chainFamily: enumProp("Imported chain family.", daoChainFamilyLiterals),
    chainRef: stringProp("Chain reference."),
    governanceAddress: stringProp("Governor contract address."),
    treasuryAddress: stringProp("Treasury address."),
    safeAddress: stringProp("Safe multisig address."),
    timelockAddress: stringProp("Timelock controller address."),
    tokenAddress: stringProp("Governance token address."),
    realmAddress: stringProp("Realms address."),
    squadsAddress: stringProp("Squads multisig address."),
    proofAddress: stringProp("Address used to prove control of the imported DAO."),
    linkedAgentId: stringProp("Optional linked agent ID."),
    tags: arrayProp("Optional DAO tags.", STRING_ARRAY_ITEM_SCHEMA, {
      maxItems: 12,
    }),
    capabilities: daoCapabilitiesProp,
    metadata: jsonObjectProp("Optional metadata."),
  },
  ["chainFamily", "chainRef", "proofAddress"],
  { additionalProperties: false },
);

const daoProposalInputSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    daoId: stringProp("DAO organization ID."),
    title: stringProp("Proposal title.", { minLength: 2, maxLength: 240 }),
    slug: stringProp("Optional proposal slug.", { minLength: 2, maxLength: 160 }),
    description: stringProp("Proposal description.", { maxLength: 8000 }),
    chainBindingId: stringProp("Optional chain binding ID."),
    externalProposalId: stringProp("Optional external proposal identifier."),
    proposerAgentId: stringProp("Optional proposer agent ID."),
    startAt: stringProp("Optional ISO8601 proposal start time."),
    endAt: stringProp("Optional ISO8601 proposal end time."),
    quorum: stringProp("Optional quorum requirement."),
    threshold: stringProp("Optional passing threshold."),
    actions: arrayProp("Optional structured proposal actions.", jsonObjectProp("Action payload.")),
    metadata: jsonObjectProp("Optional proposal metadata."),
  },
  ["daoId", "title"],
  { additionalProperties: false },
);

const daoVoteSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    daoId: stringProp("DAO organization ID."),
    proposalId: stringProp("Proposal ID."),
    choice: enumProp("Vote choice.", daoVoteChoiceLiterals),
    voterAddress: stringProp("Wallet address used to vote."),
    voterAgentId: stringProp("Optional voting agent ID."),
    weight: stringProp("Optional vote weight."),
    reason: stringProp("Optional vote rationale.", { maxLength: 4000 }),
    txHash: stringProp("Optional on-chain vote transaction hash."),
    metadata: jsonObjectProp("Optional vote metadata."),
  },
  ["daoId", "proposalId", "choice", "voterAddress"],
  { additionalProperties: false },
);

const daoTreasuryActionSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    daoId: stringProp("DAO organization ID."),
    chainBindingId: stringProp("Optional chain binding ID."),
    proposalId: stringProp("Optional proposal ID."),
    requestedByAgentId: stringProp("Optional requesting agent ID."),
    title: stringProp("Treasury action title.", {
      minLength: 2,
      maxLength: 240,
    }),
    actionType: stringProp("Treasury action type.", {
      minLength: 2,
      maxLength: 120,
    }),
    targetAddress: stringProp("Optional target address."),
    valueBaseUnits: stringProp("Optional base-unit value to move."),
    payload: jsonObjectProp("Structured treasury action payload."),
    status: enumProp(
      "Initial treasury action status.",
      daoTreasuryActionStatusLiterals,
      "pending_approval",
    ),
    approvalRequestId: stringProp("Existing approval request ID, if already created."),
    metadata: jsonObjectProp("Optional treasury action metadata."),
  },
  ["daoId", "title", "actionType", "payload"],
  { additionalProperties: false },
);

const daoExecuteTreasuryActionSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    daoId: stringProp("DAO organization ID."),
    actionId: stringProp("Treasury action ID."),
    status: enumProp(
      "Execution lifecycle status update.",
      [
        "pending_approval",
        "approved",
        "submitted",
        "executed",
        "failed",
        "cancelled",
      ] as const,
      "submitted",
    ),
    txHash: stringProp("Optional execution transaction hash."),
    lastError: stringProp("Optional error message."),
  },
  ["daoId", "actionId"],
  { additionalProperties: false },
);

const daoManageMembersSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    daoId: stringProp("DAO organization ID."),
    userId: stringProp("Optional user ID to add or update."),
    agentId: stringProp("Optional agent ID to add or update."),
    membershipType: enumProp(
      "Membership type.",
      daoMembershipTypeLiterals,
      "user",
    ),
    role: enumProp("DAO role.", daoMembershipRoleLiterals),
    walletAddress: stringProp("Optional wallet address."),
    votingPower: stringProp("Optional voting power."),
    source: stringProp("Optional membership source."),
    isActive: booleanProp("Whether the membership is active.", true),
    metadata: jsonObjectProp("Optional membership metadata."),
  },
  ["daoId", "role"],
  { additionalProperties: false },
);

const daoUpdateCapabilitiesSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    daoId: stringProp("DAO organization ID."),
    capabilities: daoCapabilitiesProp,
  },
  ["daoId", "capabilities"],
  { additionalProperties: false },
);

const daoSyncSchema = createToolSchema(
  {
    orgId: stringProp("Optional organization ID override."),
    daoId: stringProp("DAO organization ID."),
    jobType: stringProp("Optional sync job type override."),
  },
  ["daoId"],
  { additionalProperties: false },
);

export const daoDirectorySearchTool = createTool<
  DaoDirectorySearchInput,
  DaoToolResult<AgentDaosArtifactData>
>({
  description:
    "Search DAO organizations by category, chain family, ownership mode, import source, or whether the current user manages them. Emits the agent-daos artifact.",
  schema: daoDirectorySearchSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context);
    const filters: Partial<DaoDirectoryFilters> = {
      query: input.query?.trim() || undefined,
      category: input.category?.trim() || undefined,
      chainFamily: input.chainFamily,
      ownershipMode: input.ownershipMode,
      importSource: input.importSource,
      lifecycleState: input.lifecycleState,
      mineOnly: input.mineOnly ?? false,
    };

    const items = await listDaoDirectory({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      filters,
    });
    const payload = buildAgentDaosArtifactData(items);

    return buildArtifactResult({
      artifactType: "agent-daos",
      identifier: "agent-daos-directory",
      title: payload.title,
      summary: payload.summary ?? `Loaded ${items.length} DAO organizations.`,
      payload,
    });
  },
});

export const daoGetOverviewTool = createTool<
  DaoOverviewInput,
  DaoToolResult<DaoWorkspaceArtifactData>
>({
  description:
    "Load the unified DAO workspace overview, including proposals, treasury state, members, activity, imports, and sync jobs.",
  schema: daoOverviewSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context);
    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Loaded the DAO workspace for ${overview.dao.name}.`;
    const payload = buildWorkspaceArtifactData(overview, summary, input.focusTab);

    return buildArtifactResult({
      artifactType: "dao-workspace",
      identifier: `dao-workspace-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoGetProposalsTool = createTool<
  DaoProposalsInput,
  DaoToolResult<DaoProposalsArtifactData>
>({
  description:
    "Load the normalized proposal list and vote totals for a DAO across OpenZeppelin Governor, Realms, and imported governance sources.",
  schema: createToolSchema(
    {
      orgId: stringProp("Optional organization ID override."),
      daoId: stringProp("DAO organization ID."),
    },
    ["daoId"],
    { additionalProperties: false },
  ),
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context);
    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Loaded ${overview.proposals.length} proposals for ${overview.dao.name}.`;
    const payload = buildProposalsArtifactData(overview, summary);

    return buildArtifactResult({
      artifactType: "dao-proposals",
      identifier: `dao-proposals-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoCreateTool = createTool<
  DaoCreateToolInput,
  DaoToolResult<DaoWorkspaceArtifactData>
>({
  description:
    "Create a new DAO organization on EVM or Solana, persist the workspace model, and emit the DAO workspace artifact.",
  schema: daoCreateSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, {
      requireAal2:
        input.ownershipMode === "agent" ||
        input.ownershipMode === "hybrid" ||
        Boolean(input.linkedAgentId),
    });

    const overview = await createDao({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      input: {
        ...input,
        ownershipMode: input.ownershipMode ?? "user",
        linkedAgentId: input.linkedAgentId ?? null,
        tags: normalizeStringArray(input.tags),
      } satisfies CreateDaoInput,
    });

    const summary = `Created ${overview.dao.name} for ${overview.dao.primaryChainFamily.toUpperCase()} governance.`;
    const payload = buildWorkspaceArtifactData(overview, summary, "overview");

    return buildArtifactResult({
      artifactType: "dao-workspace",
      identifier: `dao-workspace-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoImportTool = createTool<
  DaoImportToolInput,
  DaoToolResult<DaoWorkspaceArtifactData>
>({
  description:
    "Import an existing Governor/Safe or Realm/Squads DAO after verifying signer or member control, then emit the DAO workspace artifact.",
  schema: daoImportSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, {
      requireAal2:
        input.ownershipMode === "agent" ||
        input.ownershipMode === "hybrid" ||
        Boolean(input.linkedAgentId),
    });

    const overview = await importDao({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      input: {
        ...input,
        ownershipMode: input.ownershipMode ?? "user",
        governanceAddress: input.governanceAddress ?? null,
        treasuryAddress: input.treasuryAddress ?? null,
        safeAddress: input.safeAddress ?? null,
        timelockAddress: input.timelockAddress ?? null,
        tokenAddress: input.tokenAddress ?? null,
        realmAddress: input.realmAddress ?? null,
        squadsAddress: input.squadsAddress ?? null,
        linkedAgentId: input.linkedAgentId ?? null,
        tags: normalizeStringArray(input.tags),
      } satisfies ImportDaoInput,
    });

    const summary = `Imported ${overview.dao.name} and attached it to the active organization.`;
    const payload = buildWorkspaceArtifactData(overview, summary, "overview");

    return buildArtifactResult({
      artifactType: "dao-workspace",
      identifier: `dao-workspace-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoDraftProposalTool = createTool<
  DaoDraftProposalToolInput,
  DaoToolResult<DaoProposalsArtifactData>
>({
  description:
    "Create a draft DAO proposal without opening voting yet, then emit the DAO proposals artifact.",
  schema: daoProposalInputSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, {
      requireAal2: Boolean(input.proposerAgentId),
    });

    await createDaoProposal({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
      input: {
        ...input,
        startAt: input.startAt ?? null,
        endAt: input.endAt ?? null,
        proposerAgentId: input.proposerAgentId ?? null,
        status: "draft",
      } satisfies DaoProposalInput,
    });

    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Drafted proposal "${input.title}" for ${overview.dao.name}.`;
    const payload = buildProposalsArtifactData(overview, summary);

    return buildArtifactResult({
      artifactType: "dao-proposals",
      identifier: `dao-proposals-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoSubmitProposalTool = createTool<
  DaoSubmitProposalToolInput,
  DaoToolResult<DaoProposalsArtifactData>
>({
  description:
    "Create and submit a DAO proposal into the active governance flow, then emit the DAO proposals artifact.",
  schema: createToolSchema(
    {
      ...daoProposalInputSchema.properties,
      status: enumProp(
        "Submission status.",
        ["active", "queued", "succeeded"] as const,
        "active",
      ),
    },
    ["daoId", "title"],
    { additionalProperties: false },
  ),
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, { requireAal2: true });

    await createDaoProposal({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
      input: {
        ...input,
        startAt: input.startAt ?? null,
        endAt: input.endAt ?? null,
        proposerAgentId: input.proposerAgentId ?? null,
        status: input.status ?? "active",
      } satisfies DaoProposalInput,
    });

    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Submitted proposal "${input.title}" for ${overview.dao.name}.`;
    const payload = buildProposalsArtifactData(overview, summary);

    return buildArtifactResult({
      artifactType: "dao-proposals",
      identifier: `dao-proposals-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoVoteTool = createTool<
  DaoVoteToolInput,
  DaoToolResult<DaoProposalsArtifactData>
>({
  description:
    "Cast a vote on a DAO proposal with the current user or linked agent identity, then emit the DAO proposals artifact.",
  schema: daoVoteSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, { requireAal2: true });

    await castDaoVote({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
      input: {
        ...input,
        voterAgentId: input.voterAgentId ?? null,
      } satisfies DaoVoteInput,
    });

    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Recorded a ${input.choice} vote for ${overview.dao.name}.`;
    const payload = buildProposalsArtifactData(overview, summary);

    return buildArtifactResult({
      artifactType: "dao-proposals",
      identifier: `dao-proposals-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoCreateTreasuryActionTool = createTool<
  DaoCreateTreasuryActionToolInput,
  DaoToolResult<DaoTreasuryArtifactData>
>({
  description:
    "Create a treasury action for a DAO, queue an approval request when needed, and emit the DAO treasury artifact.",
  schema: daoTreasuryActionSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, { requireAal2: true });
    const approvalRequestId =
      input.approvalRequestId ??
      (await createTreasuryApproval({
        userId: auth.userId,
        daoId: input.daoId,
        action: input,
      }));

    await createDaoTreasuryAction({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
      input: {
        ...input,
        targetAddress: input.targetAddress ?? null,
        requestedByAgentId: input.requestedByAgentId ?? null,
        approvalRequestId,
        status:
          input.status && input.status !== "draft"
            ? input.status
            : "pending_approval",
      } satisfies DaoTreasuryActionInput,
    });

    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Queued treasury action "${input.title}" for approval.`;
    const payload = buildTreasuryArtifactData(overview, summary);

    return buildArtifactResult({
      artifactType: "dao-treasury",
      identifier: `dao-treasury-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
      status: "awaiting_approval",
      approvalRequestId,
    });
  },
});

export const daoExecuteTreasuryActionTool = createTool<
  DaoExecuteTreasuryActionToolInput,
  DaoToolResult<DaoTreasuryArtifactData>
>({
  description:
    "Advance a DAO treasury action through approval, submission, execution, or failure states, then emit the DAO treasury artifact.",
  schema: daoExecuteTreasuryActionSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, { requireAal2: true });
    const orgId = input.orgId ?? auth.orgId;

    if (
      input.txHash !== undefined ||
      input.lastError !== undefined ||
      (input.status !== undefined &&
        input.status !== "submitted" &&
        input.status !== "executed")
    ) {
      await updateDaoTreasuryAction({
        userId: auth.userId,
        orgId,
        daoId: input.daoId,
        actionId: input.actionId,
        patch: {
          status: input.status ?? (input.txHash ? "executed" : "submitted"),
          txHash: input.txHash,
          lastError: input.lastError,
        },
      });
    } else {
      await executeDaoTreasuryAction({
        userId: auth.userId,
        orgId,
        daoId: input.daoId,
        actionId: input.actionId,
      });
    }

    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId,
      daoId: input.daoId,
    });
    const summary = `Updated treasury action ${input.actionId} for ${overview.dao.name}.`;
    const payload = buildTreasuryArtifactData(overview, summary);

    return buildArtifactResult({
      artifactType: "dao-treasury",
      identifier: `dao-treasury-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoManageMembersTool = createTool<
  DaoManageMembersToolInput,
  DaoToolResult<DaoWorkspaceArtifactData>
>({
  description:
    "Add, update, archive, or reactivate DAO members, council seats, and agent memberships, then emit the DAO workspace artifact.",
  schema: daoManageMembersSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, {
      requireAal2:
        Boolean(input.agentId) || input.membershipType === "agent",
    });

    await upsertDaoMembership({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
      input: {
        ...input,
        userId: input.userId ?? null,
        agentId: input.agentId ?? null,
        walletAddress: input.walletAddress ?? null,
        membershipType: input.membershipType ?? "user",
        isActive: input.isActive ?? true,
      } satisfies DaoMembershipInput,
    });

    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Updated DAO membership access for ${overview.dao.name}.`;
    const payload = buildWorkspaceArtifactData(overview, summary, "members");

    return buildArtifactResult({
      artifactType: "dao-workspace",
      identifier: `dao-workspace-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoUpdateCapabilitiesTool = createTool<
  DaoUpdateCapabilitiesToolInput,
  DaoToolResult<DaoWorkspaceArtifactData>
>({
  description:
    "Update app-layer DAO capability flags for treasury, proposals, voting, members, and agent automation, then emit the DAO workspace artifact.",
  schema: daoUpdateCapabilitiesSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, {
      requireAal2:
        input.capabilities.agentAutomationEnabled === true ||
        input.capabilities.agentVotingEnabled === true,
    });

    await updateDaoCapabilities({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
      patch: input.capabilities,
    });

    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Updated DAO capabilities for ${overview.dao.name}.`;
    const payload = buildWorkspaceArtifactData(
      overview,
      summary,
      "capabilities",
    );

    return buildArtifactResult({
      artifactType: "dao-workspace",
      identifier: `dao-workspace-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});

export const daoSyncTool = createTool<
  DaoSyncToolInput,
  DaoToolResult<DaoWorkspaceArtifactData> & { job: DaoSyncJob }
>({
  description:
    "Queue a DAO sync job for governance, treasury, and directory indexing, then emit the DAO workspace artifact.",
  schema: daoSyncSchema,
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context);
    const job = await syncDao({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
      jobType: input.jobType,
    });
    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Queued ${job.jobType} for ${overview.dao.name}.`;
    const payload = buildWorkspaceArtifactData(overview, summary, "settings");
    const artifactResult = buildArtifactResult({
      artifactType: "dao-workspace",
      identifier: `dao-workspace-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });

    return {
      ...artifactResult,
      job,
    };
  },
});

export const daoUpdateProposalStatusTool = createTool<
  {
    orgId?: string;
    daoId: string;
    proposalId: string;
    status: (typeof daoProposalStatusLiterals)[number];
  },
  DaoToolResult<DaoProposalsArtifactData>
>({
  description:
    "Update a DAO proposal lifecycle state after submission, queueing, execution, defeat, or cancellation, then emit the DAO proposals artifact.",
  schema: createToolSchema(
    {
      orgId: stringProp("Optional organization ID override."),
      daoId: stringProp("DAO organization ID."),
      proposalId: stringProp("Proposal ID."),
      status: enumProp("Proposal lifecycle status.", daoProposalStatusLiterals),
    },
    ["daoId", "proposalId", "status"],
    { additionalProperties: false },
  ),
  execute: async (input, context) => {
    const auth = await resolveDaoToolAuth(context, { requireAal2: true });

    await updateDaoProposalStatus({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
      proposalId: input.proposalId,
      status: input.status,
    });

    const overview = await loadOverviewForArtifact({
      userId: auth.userId,
      orgId: input.orgId ?? auth.orgId,
      daoId: input.daoId,
    });
    const summary = `Updated proposal ${input.proposalId} to ${input.status}.`;
    const payload = buildProposalsArtifactData(overview, summary);

    return buildArtifactResult({
      artifactType: "dao-proposals",
      identifier: `dao-proposals-${overview.dao.id}`,
      title: payload.title,
      summary,
      payload,
    });
  },
});
